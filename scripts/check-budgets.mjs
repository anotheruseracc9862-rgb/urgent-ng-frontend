#!/usr/bin/env node
/**
 * First-load JavaScript budgets per route (Frontend Build Plan F10-03).
 * Reads a production build; build the selected app first.
 * Usage: node scripts/check-budgets.mjs [--app=admin] [--report] (defaults to web)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = process.argv.find(arg => arg.startsWith('--app='))?.slice(6) ?? 'web';
const config = JSON.parse(readFileSync(path.join(here, 'budgets.json'), 'utf8'));
const budgets = app === 'web' ? config : config.apps?.[app];
if (!budgets) throw new Error(`No JavaScript budgets configured for ${app}`);
const nextDir = path.resolve(here, '../apps', app, '.next');
const reportOnly = process.argv.includes('--report');

const gzipCache = new Map();
function gzipKb(file) {
  if (!gzipCache.has(file)) {
    const bytes = readFileSync(path.join(nextDir, file));
    gzipCache.set(file, gzipSync(bytes).length);
  }
  return gzipCache.get(file);
}

function pageManifests(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) found.push(...pageManifests(full));
    else if (name === 'page_client-reference-manifest.js') found.push(full);
  }
  return found;
}

function loadManifest(file) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('= {') + 2;
  const json = source.slice(start).replace(/;\s*$/, '');
  return JSON.parse(json);
}

const build = JSON.parse(readFileSync(path.join(nextDir, 'build-manifest.json'), 'utf8'));
// Polyfills are served only to browsers that need them, so they are not part of first load.
const shared = [...(build.rootMainFiles ?? [])];

const rows = [];
for (const file of pageManifests(path.join(nextDir, 'server/app'))) {
  const manifest = loadManifest(file);
  const entries = manifest.entryJSFiles ?? {};
  const route = '/' + path
    .relative(path.join(nextDir, 'server/app'), path.dirname(file))
    .split(path.sep).join('/')
    .replace(/\([^)]*\)\/?/g, '')
    .replace(/\/$/, '');
  if (route.startsWith('/_') || route.includes('dev/')) continue;

  const pageKey = Object.keys(entries).find((key) => key.endsWith('/page'));
  if (!pageKey) continue;
  // The page, its layouts, and the app shell; error and not-found boundaries load on demand.
  const keys = Object.keys(entries).filter((key) => !/\/(error|not-found|global-error)$/.test(key));
  const chunks = new Set(shared);
  for (const key of keys) for (const chunk of entries[key]) chunks.add(chunk);
  let bytes = 0;
  for (const chunk of chunks) {
    if (chunk.endsWith('.js')) bytes += gzipKb(chunk);
  }
  const mapsInFirstLoad = [...chunks].some((chunk) => chunk.endsWith('.js')
    && /maps\.googleapis\.com|js-api-loader|importLibrary\(['"]maps/.test(readFileSync(path.join(nextDir, chunk), 'utf8')));
  rows.push({ route: route || '/', kb: Math.round((bytes / 1024) * 10) / 10, mapsInFirstLoad });
}
rows.sort((a, b) => b.kb - a.kb);
if (!rows.length) throw new Error(`No page manifests found for ${app}; run its production build first.`);
for (const required of budgets.requiredRoutes ?? []) {
  if (!rows.some(row => row.route === required)) throw new Error(`Missing ${app} route manifest: ${required}`);
}

function budgetFor(route) {
  const match = budgets.groups.find((group) => group.routes.some((pattern) => new RegExp(pattern).test(route)));
  return match ? match.maxKb : budgets.defaultMaxKb;
}

let failed = 0;
const mapRoutes = new Set(budgets.mapRoutes ?? []);
for (const row of rows) {
  if (row.mapsInFirstLoad && !mapRoutes.has(row.route)) {
    failed += 1;
    console.log(`OVER  maps SDK code is in the first-load JavaScript of ${row.route}; load it with next/dynamic`);
  }
}
for (const row of rows) {
  const limit = budgetFor(row.route);
  const over = row.kb > limit;
  if (over) failed += 1;
  console.log(`${over ? 'OVER ' : 'ok   '} ${String(row.kb).padStart(7)} kB / ${String(limit).padStart(4)} kB  ${row.route}`);
}
if (reportOnly) process.exit(0);
if (failed) {
  console.error(`\n${failed} route(s) exceed the first-load JavaScript budget.`);
  process.exit(1);
}
console.log(`\nAll ${rows.length} routes are within budget.`);
