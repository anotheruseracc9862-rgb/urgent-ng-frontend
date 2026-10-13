import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPendingIdentity,
  readPendingIdentifier,
  setPendingIdentifier,
  setPendingVerify,
} from './pending-identity';

describe('pending identity', () => {
  afterEach(() => clearPendingIdentity());

  it('keeps phone and email out of web storage', () => {
    setPendingVerify({ via: 'phone', phone: '+2348031234567' });
    setPendingIdentifier('ada@example.com');

    expect(readPendingIdentifier()).toBe('ada@example.com');
    expect(JSON.stringify({ ...sessionStorage })).not.toMatch(/2348031234567|ada@example/);
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/2348031234567|ada@example/);
  });

  it('clears on sign-out', () => {
    setPendingIdentifier('08031234567');
    clearPendingIdentity();
    expect(readPendingIdentifier()).toBeNull();
  });
});
