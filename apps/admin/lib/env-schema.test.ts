import { describe, expect, it } from 'vitest';
import { parseAdminEnvironment } from './env-schema';

describe('parseAdminEnvironment', () => {
  it.each(['NEXT_PUBLIC_ADMIN_API_URL', 'NEXT_PUBLIC_APP_URL'])(
    'rejects a missing %s variable by name',
    (name) => {
      const source: Record<string, string | undefined> = {
        NEXT_PUBLIC_ADMIN_API_URL: 'http://127.0.0.1:4000/api/v1/admin',
        NEXT_PUBLIC_APP_URL: 'http://localhost:4002',
      };
      delete source[name];

      expect(() => parseAdminEnvironment(source)).toThrow(name);
    },
  );

  it('rejects malformed URLs by variable name', () => {
    expect(() =>
      parseAdminEnvironment({
        NEXT_PUBLIC_ADMIN_API_URL: 'not a URL',
        NEXT_PUBLIC_APP_URL: 'http://localhost:4002',
      }),
    ).toThrow('NEXT_PUBLIC_ADMIN_API_URL');
  });

  it('allows one optional HTTPS evidence origin, not wildcard, credentials or URL paths', () => {
    const base = { NEXT_PUBLIC_ADMIN_API_URL: 'http://127.0.0.1:4000/api/v1/admin', NEXT_PUBLIC_APP_URL: 'http://localhost:4002' };
    for (const origin of ['', undefined, 'https://bucket.s3.eu-west-1.amazonaws.com']) {
      expect(() => parseAdminEnvironment({ ...base, NEXT_PUBLIC_ADMIN_MEDIA_ORIGIN: origin })).not.toThrow();
    }
    for (const origin of ['*', 'https:', 'http://storage.test', 'https://user:pass@storage.test', 'https://storage.test/files', 'https://storage.test/?token=secret']) {
      expect(() => parseAdminEnvironment({ ...base, NEXT_PUBLIC_ADMIN_MEDIA_ORIGIN: origin })).toThrow('NEXT_PUBLIC_ADMIN_MEDIA_ORIGIN');
    }
  });
});
