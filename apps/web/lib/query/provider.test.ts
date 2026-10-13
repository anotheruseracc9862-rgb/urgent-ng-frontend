import { describe, expect, it } from 'vitest';
import { isSensitiveKey } from './provider';

describe('isSensitiveKey()', () => {
  it('never persists chat, location, verification, admin or auth data', () => {
    for (const root of ['chat', 'conversations', 'messages', 'location', 'verification', 'admin', 'auth', 'disputes']) {
      expect(isSensitiveKey([root, 'list', { page: 1 }])).toBe(true);
    }
  });
  it('allows ordinary feature keys', () => {
    expect(isSensitiveKey(['errands', 'list', {}])).toBe(false);
    expect(isSensitiveKey(['marketplace', 'feed'])).toBe(false);
  });
});
