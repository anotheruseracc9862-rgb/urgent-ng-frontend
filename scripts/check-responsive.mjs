#!/usr/bin/env node
/**
 * Horizontal-overflow check at 360, 768 and 1280 px (Frontend Build Plan F10-02).
 * Drives a headless Chrome through the DevTools protocol against a running web app.
 *
 *   npm run start -w web -- -p 4001          # in another terminal, after a build
 *   node scripts/check-responsive.mjs [baseUrl]
 *
 * It covers routes that render without a session. Signed-in routes need the backend and are
 * listed in the plan as a manual pass.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4001';
const WIDTHS = [360, 768, 1280];
const ROUTES = [
  '/', '/pricing', '/help', '/terms', '/privacy', '/login', '/register', '/forgot-password',
  '/reset-password', '/link-expired', '/verify', '/session', '/this-page-does-not-exist',
];
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error('Chrome not found. Set CHROME_PATH.');
  process.exit(2);
}

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu',
  `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'urgent-responsive-'))}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function webSocketUrl() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
      const target = await response.json();
      return target.webSocketDebuggerUrl;
    } catch {
      await sleep(200);
    }
  }
  throw new Error('Could not reach Chrome DevTools.');
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const listeners = [];
    socket.onopen = () => resolve({
      send(method, params = {}) {
        id += 1;
        socket.send(JSON.stringify({ id, method, params }));
        return new Promise((done, fail) => pending.set(id, { done, fail }));
      },
      on(handler) { listeners.push(handler); },
      close() { socket.close(); },
    });
    socket.onerror = reject;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { done, fail } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) fail(new Error(message.error.message)); else done(message.result);
      } else {
        listeners.forEach((handler) => handler(message));
      }
    };
  });
}

const MEASURE = `(() => {
  const vw = document.documentElement.clientWidth;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const style = getComputedStyle(el);
    if (style.position === 'fixed' || style.visibility === 'hidden' || style.display === 'none') continue;
    let clipped = false;
    for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const overflowX = getComputedStyle(parent).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden') { clipped = true; break; }
    }
    if (!clipped && rect.right > vw + 1) {
      offenders.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '') + ' right=' + Math.round(rect.right));
    }
  }
  return { scrollWidth: document.documentElement.scrollWidth, vw, offenders: offenders.slice(0, 5) };
})()`;

let failures = 0;
try {
  const client = await connect(await webSocketUrl());
  await client.send('Page.enable');
  await client.send('Log.enable');
  const cspViolations = new Set();
  client.on((message) => {
    if (message.method === 'Log.entryAdded' && /Content Security Policy/i.test(message.params.entry.text)) {
      cspViolations.add(message.params.entry.text.slice(0, 200));
    }
  });
  for (const width of WIDTHS) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width, height: width === 360 ? 740 : 900, deviceScaleFactor: 1, mobile: width < 700,
    });
    for (const route of ROUTES) {
      await client.send('Page.navigate', { url: `${BASE}${route}` });
      await sleep(2500);
      const { result } = await client.send('Runtime.evaluate', { expression: MEASURE, returnByValue: true });
      const { scrollWidth, vw, offenders } = result.value;
      const overflow = scrollWidth > vw + 1;
      if (overflow) failures += 1;
      console.log(`${overflow ? 'FAIL' : 'ok  '} ${String(width).padStart(4)}px ${route}${overflow ? `  scrollWidth=${scrollWidth} > ${vw}  ${offenders.join(' | ')}` : ''}`);
    }
  }
  client.close();
  if (cspViolations.size) {
    failures += cspViolations.size;
    for (const text of cspViolations) console.log(`CSP  ${text}`);
  }
} finally {
  chrome.kill();
}
if (failures) {
  console.error(`${failures} problem(s): horizontal scroll or Content-Security-Policy violations.`);
  process.exit(1);
}
console.log('No horizontal overflow or CSP violation on any checked page.');
