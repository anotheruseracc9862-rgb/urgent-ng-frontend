import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { describeAuthError } from './auth-ui';

const err = (code: string, details?: unknown, message = 'server message') =>
  new ApiError(400, code, message, details);

describe('describeAuthError()', () => {
  it('shows the lockout wait in minutes', () => {
    expect(describeAuthError(err('ACCOUNT_LOCKED', { retryAfterSeconds: 540 }))).toMatch(/9 minutes/);
    expect(describeAuthError(err('ACCOUNT_LOCKED', { retryAfterSeconds: 30 }))).toMatch(/1 minute\./);
  });
  it('shows remaining OTP attempts', () => {
    expect(describeAuthError(err('OTP_INVALID', { remainingAttempts: 2 }))).toMatch(/2 attempts left/);
    expect(describeAuthError(err('OTP_INVALID', { remainingAttempts: 1 }))).toMatch(/1 attempt left/);
  });
  it('gives each case its own message', () => {
    const messages = ['INVALID_CREDENTIALS', 'OTP_EXPIRED', 'OTP_RATE_LIMITED', 'IDENTIFIER_TAKEN'].map((c) =>
      describeAuthError(err(c)),
    );
    expect(new Set(messages).size).toBe(4);
  });
  it('uses the first validation message', () => {
    expect(describeAuthError(err('VALIDATION_ERROR', { fields: ['password too short'] }))).toBe('password too short');
  });
  it('falls back for non-API errors', () => {
    expect(describeAuthError(new Error('boom'))).toMatch(/try again/i);
  });
});
