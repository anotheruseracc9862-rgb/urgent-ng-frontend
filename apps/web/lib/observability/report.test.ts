import { describe, expect, it, vi } from 'vitest';
import { scrub, toSafeReport } from './report';
import { reportWebVitals } from './web-vitals';

describe('safe error reporting', () => {
  it('scrubs phones, emails and long ids from messages and stacks', () => {
    const error = new Error('Failed for ada@example.com on 08031234567 (id 1234567890123456)');
    error.stack = `Error: ${error.message}\n    at pay (+234 803 123 4567)`;

    const report = toSafeReport(error, 'query');

    expect(report.scope).toBe('query');
    expect(report.message).toBe('Failed for [EMAIL] on [PHONE] (id [ID])');
    expect(report.stack).not.toMatch(/ada@example|0803|1234567890123456/);
  });

  it('wraps non-Error throws', () => {
    expect(toSafeReport('boom', 'realtime')).toMatchObject({ name: 'Error', message: 'boom' });
  });

  it('removes bearer secrets from trusted-contact paths', () => {
    expect(toSafeReport(new Error('Failed GET https://urgent.ng/shared/a-secret_token'), 'query').message)
      .toBe('Failed GET https://urgent.ng/shared/[TOKEN]');
  });

  it('reports public page performance without transmitting its sharing secret', () => {
    const sendBeacon = vi.fn();
    const original = window.location.href;
    vi.stubGlobal('navigator', { sendBeacon });
    vi.stubEnv('NODE_ENV', 'production');
    window.history.replaceState({}, '', '/shared/a-secret_token');
    try {
      reportWebVitals({ name: 'LCP', value: 123, rating: 'good', delta: 123, id: 'metric' });
      expect(JSON.parse(sendBeacon.mock.calls[0][1])).toMatchObject({ url: '/shared/[token]' });
      expect(sendBeacon.mock.calls[0][1]).not.toContain('a-secret_token');
    } finally {
      window.history.replaceState({}, '', original);
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });

  it('keeps undefined input undefined', () => {
    expect(scrub(undefined)).toBeUndefined();
  });
});
