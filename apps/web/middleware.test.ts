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
  it.each(['/dashboard', '/errands', '/errands?tab=active', '/marketplace/offer-1', '/messages/c1', '/safety', '/reports/case-id', '/disputes/case-id'])(
    'shows the coming-soon page instead of the business area %s, signed in or not',
    (path) => {
      const response = middleware(new NextRequest(`https://app.test${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('x-middleware-rewrite')).toBe('https://app.test/coming-soon');
      expect(response.headers.get('x-robots-tag')).toBe('noindex');
    },
  );

  it.each(['/', '/help', '/pricing', '/login', '/register'])('leaves the public page %s open', (path) => {
    const response = middleware(new NextRequest(`https://app.test${path}`));
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.status).toBe(200);
  });

  it.each(['/onboarding', '/policy-acceptance', '/account/standing'])('keeps %s as a signed-in account page, not coming soon', (path) => {
    const response = middleware(new NextRequest(`https://app.test${path}`));
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toContain('/session?redirect=');
  });

  it('does not allow a backslash-based external post-login redirect', () => {
    const token = tokenWithExpiry(Math.floor(Date.now() / 1000) + 60);
    const request = new NextRequest('https://app.test/login?redirect=%2F%5Cevil.example', {
      headers: { cookie: `ung_at=${token}` },
    });
    const response = middleware(request);
    expect(response.headers.get('location')).toBe('https://app.test/dashboard');
  });

  it('bounces a signed-in visitor off /login, except after a session was found dead', () => {
    const token = tokenWithExpiry(Math.floor(Date.now() / 1000) + 600);
    const request = (path: string) => new NextRequest(`https://app.test${path}`, { headers: { cookie: `ung_at=${token}` } });
    expect(middleware(request('/login')).status).toBe(307);
    // The API rejected this cookie (for example after a database reset): do not loop back to the app.
    expect(middleware(request('/login?reason=session-expired&redirect=%2Fdashboard')).status).toBe(200);
    expect(middleware(request('/login?reason=session-check-failed')).status).toBe(200);
  });
});
