import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { isAccessTokenValid, middleware } from './middleware';

function tokenWithExpiry(exp: number): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ exp })}.`;
}

describe('isAccessTokenValid()', () => {
  it('accepts a decodable access token with a future expiry', () => {
    expect(isAccessTokenValid(tokenWithExpiry(Math.floor(Date.now() / 1000) + 60))).toBe(true);
  });

  it('rejects missing, malformed, and expired access tokens', () => {
    expect(isAccessTokenValid(undefined)).toBe(false);
    expect(isAccessTokenValid('not-a-jwt')).toBe(false);
    expect(isAccessTokenValid(tokenWithExpiry(Math.floor(Date.now() / 1000) - 60))).toBe(false);
  });
});

describe('middleware()', () => {
  it('sends unauthenticated protected visits through the browser refresh route', () => {
    const response = middleware(new NextRequest('https://app.test/errands?tab=active'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://app.test/session?redirect=%2Ferrands%3Ftab%3Dactive',
    );
  });

  it('does not allow a backslash-based external post-login redirect', () => {
    const token = tokenWithExpiry(Math.floor(Date.now() / 1000) + 60);
    const request = new NextRequest('https://app.test/login?redirect=%2F%5Cevil.example', {
      headers: { cookie: `ung_at=${token}` },
    });
    const response = middleware(request);
    expect(response.headers.get('location')).toBe('https://app.test/dashboard');
  });
});
