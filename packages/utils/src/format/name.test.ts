import { describe, expect, it } from 'vitest';
import { isSameFullName } from './name';

describe('isSameFullName', () => {
  it('matches the same name in any order, case or with a middle name', () => {
    expect(isSameFullName('Ada Okafor', 'okafor ada')).toBe(true);
    expect(isSameFullName('Ada Okafor', 'Ada Chinwe Okafor')).toBe(true);
  });

  it('does not match different people or a single shared word', () => {
    expect(isSameFullName('Ngozi Okafor', 'Ada Okafor')).toBe(false);
    expect(isSameFullName('Ada', 'Ada Okafor')).toBe(false);
  });
});
