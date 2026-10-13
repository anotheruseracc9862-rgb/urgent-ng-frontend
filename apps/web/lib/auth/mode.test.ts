import { afterEach, describe, expect, it } from 'vitest';
import { saveMode } from './mode';

afterEach(() => {
  document.cookie = 'ung_mode=; path=/; max-age=0';
});

describe('saveMode()', () => {
  it('persists the selected requester or runner mode in the server-readable cookie', () => {
    saveMode('RUNNER');
    expect(document.cookie).toContain('ung_mode=RUNNER');

    saveMode('REQUESTER');
    expect(document.cookie).toContain('ung_mode=REQUESTER');
  });
});
