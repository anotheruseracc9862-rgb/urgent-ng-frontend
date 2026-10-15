#!/usr/bin/env node
/**
 * Accessibility check in a real browser (Frontend Build Plan F10-01).
 * Injects axe-core into headless Chrome and reports serious and critical violations, including
 * colour contrast, which a DOM simulator cannot measure.
 *
 *   node scripts/check-axe.mjs <baseUrl> <route> [<route> ...] [--widths=360,1280]
 *
 * Covers routes that render without a session. Signed-in routes need the backend and a session.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const widthArg = args.find((arg) => arg.startsWith('--widths='));
const widths = (widthArg?.slice(9) ?? '360,1280').split(',').map(Number);
const [base, ...routes] = args.filter((arg) => !arg.startsWith('--'));
if (!base || routes.length === 0) {
  console.error('Usage: node scripts/check-axe.mjs <baseUrl> <route> [<route> ...] [--widths=360,1280]');
  process.exit(2);
}

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const candidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chromePath = candidates.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error('Chrome not found. Set CHROME_PATH.');
  process.exit(2);
}

const port = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu',
  `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'urgent-axe-'))}`, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let socketUrl;
for (let attempt = 0; attempt < 50 && !socketUrl; attempt += 1) {
  try {
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socketUrl = target.webSocketDebuggerUrl;
  } catch {
    await sleep(200);
  }
}
if (!socketUrl) {
  chrome.kill();
  throw new Error('Could not reach Chrome DevTools.');
}

const socket = new WebSocket(socketUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const waiting = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && waiting.has(message.id)) {
    waiting.get(message.id)(message.result ?? { error: message.error });
    waiting.delete(message.id);
  }
};
const send = (method, params = {}) => new Promise((resolve) => {
  nextId += 1;
  waiting.set(nextId, resolve);
  socket.send(JSON.stringify({ id: nextId, method, params }));
});

let failures = 0;
try {
  await send('Page.enable');
  await send('Runtime.enable');
  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 700 ? 740 : 900, deviceScaleFactor: 1, mobile: width < 700 });
    for (const route of routes) {
      await send('Page.navigate', { url: `${base}${route}` });
      await sleep(2500);
      await send('Runtime.evaluate', { expression: axeSource });
      const { result, exceptionDetails } = await send('Runtime.evaluate', {
        expression: `axe.run(document, { resultTypes: ['violations'] }).then((r) => JSON.stringify(r.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.any[0]?.message ?? n.failureSummary ?? '').split('\\n')[0]) }))))`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (exceptionDetails || !result?.value) {
        failures += 1;
        console.log(`ERROR ${String(width).padStart(4)}px ${route}  axe did not run`);
        continue;
      }
      const violations = JSON.parse(result.value);
      if (violations.length) failures += violations.length;
      console.log(`${violations.length ? 'FAIL' : 'ok  '} ${String(width).padStart(4)}px ${route}`);
      for (const violation of violations) {
        console.log(`       ${violation.impact} ${violation.id}: ${violation.help}`);
        for (const node of violation.nodes) console.log(`         - ${node}`);
      }
    }
  }
} finally {
  chrome.kill();
}
if (failures) {
  console.error(`\n${failures} serious or critical accessibility problem(s).`);
  process.exit(1);
}
console.log('\nNo serious or critical accessibility violation on any checked route.');
process.exit(0);
