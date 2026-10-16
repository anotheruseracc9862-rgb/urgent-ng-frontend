import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Keeps the cache rules from decaying. New code follows the model in `lib/query`:
 *   - writes go through `useApiMutation({ affects })`, never a bare `useMutation`;
 *   - reads of migrated domains use the factories in `features/<domain>/queries.ts`.
 *
 * Every write is migrated, so the allow-list is empty and must stay empty.
 */
const ROOT = path.resolve(__dirname, '../..');
const DIRS = ['app', 'components', 'features', 'hooks', 'lib', 'providers', 'stores'];
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

const SOURCES = DIRS.flatMap((dir) => files(path.join(ROOT, dir))).map((file) => ({
  file: path.relative(ROOT, file).replaceAll('\\', '/'),
  text: readFileSync(file, 'utf8'),
}));

/** Every write is migrated, so this stays empty. A new bare `useMutation` fails the test below. */
const LEGACY_BARE_MUTATIONS = new Set<string>();

describe('cache discipline', () => {
  it('writes through useApiMutation', () => {
    const bare = SOURCES.filter(({ file, text }) => /\buseMutation\(/.test(text) && file !== 'lib/query/mutations.ts')
      .map(({ file }) => file);
    const unexpected = bare.filter((file) => !LEGACY_BARE_MUTATIONS.has(file));
    expect(unexpected, 'new code must use useApiMutation({ affects })').toEqual([]);
  });

  it('does not keep a file on the legacy list after it was migrated', () => {
    const bare = new Set(
      SOURCES.filter(({ text }) => /\buseMutation\(/.test(text)).map(({ file }) => file),
    );
    const stale = [...LEGACY_BARE_MUTATIONS].filter((file) => !bare.has(file));
    expect(stale, 'remove these from LEGACY_BARE_MUTATIONS').toEqual([]);
  });

  it('every useApiMutation declares what it affects', () => {
    const missing = SOURCES.filter(({ text }) => /\buseApiMutation\(\{/.test(text))
      .filter(({ text }) => !/\baffects:\s*\[/.test(text))
      .map(({ file }) => file);
    expect(missing).toEqual([]);
  });

  it('never hand-writes a key for a migrated domain', () => {
    const migrated = SOURCES.filter(({ file }) =>
      /^features\/(dashboard|errands\/(my-errands-page|track)|assignments\/list|marketplace\/use-nearby)/.test(file)
      || file === 'components/shell/sidebar.tsx' || file === 'components/shell/use-nav-counts.ts');
    const handWritten = migrated.filter(({ text }) => /queryKey:\s*\[/.test(text)).map(({ file }) => file);
    expect(handWritten).toEqual([]);
  });
});
