#!/usr/bin/env node
/**
 * Contract freeze check (Frontend Build Plan F10-06).
 *  1. The generated client types equal what `backend/openapi.json` generates today.
 *  2. Every API path the web app calls exists in the contract, with that method.
 *
 * Usage: node scripts/check-contract.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const specPath = path.resolve(root, '../backend/openapi.json');
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
let problems = 0;

// 1. Generated client is current.
const out = path.join(mkdtempSync(path.join(tmpdir(), 'urgent-contract-')), 'schema.d.ts');
execFileSync(process.execPath, [
  path.join(root, 'node_modules/openapi-typescript/bin/cli.js'), specPath, '-o', out,
], { stdio: 'ignore' });
const normalise = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const generated = path.join(root, 'packages/api-client/src/generated/schema.d.ts');
if (normalise(out) !== normalise(generated)) {
  problems += 1;
  console.error('FAIL generated client is out of date. Run: npm run generate -w @urgent/api-client');
} else {
  console.log('ok   generated client matches backend/openapi.json');
}

// 2. Every called path exists.
const specPaths = Object.keys(spec.paths).map((p) => ({
  raw: p.replace(/^\/api\/v1/, ''),
  /** Spec path with every {param} as the placeholder `x`, like the call sites. */
  shape: p.replace(/^\/api\/v1/, '').replace(/\{[^}]+\}/g, 'x'),
  methods: Object.keys(spec.paths[p]),
}));

function walk(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (/node_modules|\.next|[\\/]test[\\/]|\.test\.|\.spec\./.test(full)) continue;
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) found.push(full);
  }
  return found;
}

const CALL = /\b(?:api|apiResponse)(?:<[^>]*(?:<[^>]*>)?[^>]*>)?\(\s*([`'"])(\/[^`'"]*)\1([\s\S]{0,200}?)\)/g;
const missing = [];
let checked = 0;
for (const dir of ['apps/web/app', 'apps/web/features', 'apps/web/components', 'apps/web/lib']) {
  for (const file of walk(path.join(root, dir))) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(CALL)) {
      const route = match[2].replace(/\$\{[^}]+\}/g, 'x').split('?')[0];
      const literal = /method:\s*'(GET|POST|PUT|PATCH|DELETE)'/i.exec(match[3]);
      const conditional = [...match[3].matchAll(/'(GET|POST|PUT|PATCH|DELETE)'/g)].map((m) => m[1].toLowerCase());
      const wanted = literal ? [literal[1].toLowerCase()] : conditional.length ? conditional : ['get'];
      checked += 1;
      // A call-site `x` (a template value) may stand for a literal segment such as an action name.
      const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`);
      const pattern = new RegExp(`^${route.split('/').map((segment) => (segment === 'x' ? '[^/]+' : escape(segment))).join('/')}$`);
      const hit = specPaths.find((candidate) => pattern.test(candidate.shape) && wanted.every((m) => candidate.methods.includes(m)));
      if (!hit) {
        missing.push(`${path.relative(root, file).split(path.sep).join('/')}: ${wanted.join('|').toUpperCase()} ${route}`);
      }
    }
  }
}
if (missing.length) {
  problems += 1;
  console.error(`FAIL ${missing.length} call(s) are not in the contract:`);
  for (const line of missing) console.error(`  ${line}`);
} else {
  console.log(`ok   ${checked} literal API calls all exist in the contract`);
}

process.exit(problems ? 1 : 0);
