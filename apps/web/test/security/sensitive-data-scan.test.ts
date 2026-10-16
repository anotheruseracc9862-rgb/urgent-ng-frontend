import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE_DIRS = ['app', 'components', 'features', 'hooks', 'lib', 'providers', 'stores'];
const SKIP = /(\.test\.|\.spec\.|[\\/]test[\\/]|[\\/]node_modules[\\/]|[\\/]\.next[\\/])/;

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (SKIP.test(full)) continue;
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const SOURCES = SOURCE_DIRS.flatMap((dir) => files(path.join(ROOT, dir))).map((file) => ({
  file: path.relative(ROOT, file).replaceAll('\\', '/'),
  text: readFileSync(file, 'utf8'),
}));

/**
 * Every browser-storage write, with why it is safe. A new write fails this test until it is
 * reviewed and added here (Frontend PRD §32: nothing sensitive in storage).
 */
const ALLOWED_STORAGE_WRITES: Record<string, string> = {
  'features/auth/register-form.tsx': 'sessionStorage: the chosen start mode (REQUESTER or RUNNER), no personal data',
  'features/marketplace/feed/marketplace-feed-page.tsx': 'sessionStorage: scroll position',
  'features/push/push-opt-in-prompt.tsx': 'localStorage: the push device id, not the push token',
  'lib/drafts/errand-draft.ts': 'sessionStorage: what the visitor typed on the landing form, tab-scoped and cleared after use and on sign-out',
  'lib/auth/runner-intro.ts': 'localStorage: a per-user, per-mode 1 flag meaning the mode intro was shown',
  'features/billing/checkout.ts': 'sessionStorage: the pending order id only',
  'lib/storage/session-value.ts': 'sessionStorage helper for tab-scoped, non-secret UI values',
  'lib/query/persist.ts': 'localStorage: persisted query cache; only queries that opt in, never a barred family (policy.ts), scoped to one person and cleared on sign-out',
};

describe('sensitive data scan', () => {
  it('writes to browser storage only in reviewed places', () => {
    const writers = SOURCES.filter(({ text }) => /(?:local|session)Storage\b[^;\n]*\.setItem|\bstorage\(\)\??\.setItem|createSyncStoragePersister/.test(text))
      .map(({ file }) => file);
    const unreviewed = writers.filter((file) => !(file in ALLOWED_STORAGE_WRITES));
    expect(unreviewed).toEqual([]);
  });

  it('never stores a token, password, one-time code or phone number under a storage key', () => {
    const bad = SOURCES.flatMap(({ file, text }) =>
      [...text.matchAll(/(?:local|session)Storage\.setItem\(\s*([^,)]+)/g)]
        .map((match) => ({ file, key: match[1]! }))
        .filter(({ key }) => /token|password|otp|phone|secret|nin\b|bvn|address/i.test(key)));
    expect(bad).toEqual([]);
  });

  it('does not put sensitive values in a query string', () => {
    const bad = SOURCES.flatMap(({ file, text }) =>
      [...text.matchAll(/[?&](token|access_token|refresh_token|password|otp|code|phone|email|nin|bvn|address)=/gi)]
        // `ticket=` (one-time SSE ticket, valid once for 60 s) is the documented exception and is not matched here.
        .map((match) => `${file}: ${match[0]}`));
    expect(bad).toEqual([]);
  });

  it('does not log from production code', () => {
    const allowed = new Set(['lib/observability/report.ts', 'lib/observability/analytics.ts', 'lib/observability/web-vitals.ts']);
    const logging = SOURCES.filter(({ file, text }) => !allowed.has(file) && /\bconsole\.(log|debug|info)\(/.test(text))
      .map(({ file }) => file);
    expect(logging).toEqual([]);
  });

  it('persists a query only when it opts in, and never from a barred family', async () => {
    const { isPersistableKey, isSensitiveKey } = await import('@/lib/query/provider');
    // The key-level check says whether a query that opts in could be stored.
    expect(isPersistableKey(['errands', 'mine', 'u1', {}])).toBe(true);
    expect(isPersistableKey(['reference', 'categories'])).toBe(true);
    for (const key of [['conversations', 'messages', 'c1'], ['billing', 'orders'], ['assignments', 'detail', 'a1'], ['auth', 'me'], ['verification'], ['notifications']]) {
      expect(isPersistableKey(key)).toBe(false);
      expect(isSensitiveKey(key)).toBe(true);
    }
  });

  it('declares persistence only in the query factories and the policy module', () => {
    const declared = SOURCES.filter(({ text }) => /persist:\s*true/.test(text)).map(({ file }) => file).sort();
    expect(declared).toEqual(['lib/query/persisted-query.ts', 'lib/query/provider.tsx']);
    // Pages that opt a list in directly. Each holds approximate areas only, never an exact address.
    const reviewed = new Set([
      'features/marketplace/feed/marketplace-feed-page.tsx',
      'features/marketplace/saved/saved-errands-page.tsx',
      'features/offers/list/my-offers-page.tsx',
      'features/marketplace/use-nearby-errands.ts',
    ]);
    const users = SOURCES.filter(({ file, text }) => /persistedQuery\(/.test(text) && !file.endsWith('queries.ts') && !reviewed.has(file) && file !== 'lib/query/persisted-query.ts')
      .map(({ file }) => file);
    expect(users).toEqual([]);
  });
});
