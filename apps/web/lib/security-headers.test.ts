import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, securityHeaders } from './security-headers';

describe('security headers', () => {
  const prod = { production: true, apiOrigin: 'https://api.urgent.ng/api/v1' };

  it('blocks framing, plugins and foreign form posts', () => {
    const csp = contentSecurityPolicy(prod);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('allows only the API origin and Google for connections, and no eval in production', () => {
    const csp = contentSecurityPolicy(prod);
    expect(csp).toContain("connect-src 'self' https://api.urgent.ng");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain('ws:');
  });

  it('allows eval and local hosts only outside production', () => {
    const csp = contentSecurityPolicy({ production: false });
    expect(csp).toContain("'unsafe-eval'");
  });

  it('sends HSTS only in production and limits camera and location to the app', () => {
    const headers = (options: typeof prod | { production: false }) =>
      Object.fromEntries(securityHeaders(options).map((h) => [h.key, h.value]));
    expect(headers(prod)['Strict-Transport-Security']).toContain('max-age=');
    expect(headers({ production: false })['Strict-Transport-Security']).toBeUndefined();
    expect(headers(prod)['Permissions-Policy']).toContain('geolocation=(self)');
    expect(headers(prod)['Permissions-Policy']).toContain('camera=(self)');
    expect(headers(prod)['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });
});
