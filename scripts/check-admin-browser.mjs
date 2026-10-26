#!/usr/bin/env node
/**
 * Signed-in admin browser check: horizontal overflow, serious/critical axe violations, and which
 * workspaces the account can see. Drives headless Chrome through the DevTools protocol.
 *
 *   ADMIN_E2E_EMAIL=... ADMIN_E2E_PASSWORD=... node scripts/check-admin-browser.mjs <adminBaseUrl>
 *     [--widths=360,768,1280] [--expect=Users,Errands] [--routes=/dashboard,/users]
 *
 * Use a test account on a test or development stack, never a production credential. The script is
 * read-only apart from signing in and out. It needs an admin app whose sign-in proxy reaches a
 * running API, and accounts without MFA (ADMIN_MFA_REQUIRED=false).
 * `--expect` asserts the exact set of workspace links shown, which verifies a permission profile.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const base = args.find((arg) => !arg.startsWith('--'));
const email = process.env.ADMIN_E2E_EMAIL;
const password = process.env.ADMIN_E2E_PASSWORD;
if (!base || !email || !password) {
  console.error('Usage: ADMIN_E2E_EMAIL=... ADMIN_E2E_PASSWORD=... node scripts/check-admin-browser.mjs <adminBaseUrl>');
  process.exit(2);
}
const widths = (option('widths') ?? '360,768,1280').split(',').map(Number);
const expected = option('expect')?.split(',');
const routes = (option('routes') ?? [
  '/dashboard', '/users', '/users?tab=verification&view=verifications', '/errands', '/errands?tab=assignments&view=assignments',
  '/cases', '/cases?tab=reports&view=reports', '/cases?tab=enforcement&view=enforcement', '/cases?tab=moderation&view=ratings',
  '/billing', '/billing?tab=refunds&view=refunds', '/billing?tab=subscriptions&view=subscriptions', '/billing?tab=boosts&view=boosts',
  '/insights', '/insights?tab=audit&view=audit', '/settings', '/settings?tab=commerce&view=pricing',
  '/settings?tab=communications&view=templates', '/settings?tab=platform&view=config', '/administration',
  '/administration?tab=staff&view=admins', '/administration?tab=system&view=outbox',
].join(',')).split(',');

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const chromePath = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean).find((candidate) => existsSync(candidate));
if (!chromePath) { console.error('Chrome not found. Set CHROME_PATH.'); process.exit(2); }

const port = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu',
  `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'urgent-admin-e2e-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socketUrl;
for (let attempt = 0; attempt < 50 && !socketUrl; attempt += 1) {
  try { socketUrl = (await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()).webSocketDebuggerUrl; } catch { await sleep(200); }
}
if (!socketUrl) { chrome.kill(); throw new Error('Could not reach Chrome DevTools.'); }
const socket = new WebSocket(socketUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const waiting = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && waiting.has(message.id)) { waiting.get(message.id)(message.result ?? { error: message.error }); waiting.delete(message.id); }
};
const send = (method, params = {}) => new Promise((resolve) => { nextId += 1; waiting.set(nextId, resolve); socket.send(JSON.stringify({ id: nextId, method, params })); });
const evaluate = async (expression, awaitPromise = false) => (await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })).result?.value;

let failures = 0;
const fail = (message) => { failures += 1; console.log(`FAIL ${message}`); };
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: `${base}/login` }); await sleep(2500);
  // Sign-in markup must never be able to put credentials in the address bar.
  const form = await evaluate(`(() => { const f = document.querySelector('form'); return f ? f.method : null; })()`);
  if (form !== 'post') fail(`login form method is ${form}, expected post`);
  const status = await evaluate(`fetch('/api/v1/admin/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: ${JSON.stringify(email)}, password: ${JSON.stringify(password)} }) }).then((r) => r.status)`, true);
  if (status !== 200) { fail(`sign-in returned ${status}; check the account, MFA setting and that the admin proxy reaches the API`); throw new Error('sign-in failed'); }

  let seenNav;
  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 700 ? 740 : 900, deviceScaleFactor: 1, mobile: width < 700 });
    for (const route of routes) {
      await send('Page.navigate', { url: base + route }); await sleep(3500);
      const page = JSON.parse(await evaluate(`JSON.stringify((() => {
        const viewport = document.documentElement.clientWidth;
        const wide = [...document.querySelectorAll('body *')].filter((el) => { const box = el.getBoundingClientRect(); return box.width > 0 && box.right > viewport + 1 && !el.closest('.table-scroll,[role=tablist],.sr-only'); }).slice(0, 5).map((el) => el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]);
        const nav = [...document.querySelectorAll('.desktop-sidebar nav a')].map((a) => a.textContent.trim());
        return { path: location.pathname, scroll: document.documentElement.scrollWidth, viewport, wide, nav };
      })())`));
      if (page.path === '/login' || page.path === '/session') { fail(`${width}px ${route} redirected to ${page.path}; the session was not accepted`); continue; }
      seenNav ??= page.nav;
      if (page.scroll > page.viewport) fail(`${width}px ${route} scrolls horizontally (${page.scroll} > ${page.viewport}) ${page.wide.join(' ')}`);
      await evaluate(axeSource);
      const violations = JSON.parse(await evaluate(`axe.run(document, { resultTypes: ['violations'] }).then((r) => JSON.stringify(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))))`, true) ?? '[]');
      for (const v of violations) fail(`${width}px ${route} axe ${v.id}: ${v.nodes.join(' | ')}`);
      if (!violations.length && page.scroll <= page.viewport) console.log(`ok   ${String(width).padStart(4)}px ${route}`);
    }
  }
  if (expected) {
    const links = (seenNav ?? []).filter((name) => name !== 'Dashboard').sort();
    if (JSON.stringify(links) !== JSON.stringify([...expected].sort())) fail(`workspace links ${JSON.stringify(links)} differ from expected ${JSON.stringify([...expected].sort())}`);
    else console.log(`ok   workspace links match: ${links.join(', ') || '(none)'}`);
  }
  await evaluate(`fetch('/api/v1/admin/auth/logout', { method: 'POST' }).then((r) => r.status)`, true);
} catch (error) {
  if (error.message !== 'sign-in failed') throw error;
} finally {
  chrome.kill();
}
if (failures) { console.error(`\n${failures} problem(s).`); process.exit(1); }
console.log('\nSigned-in admin checks passed.');
process.exit(0);
