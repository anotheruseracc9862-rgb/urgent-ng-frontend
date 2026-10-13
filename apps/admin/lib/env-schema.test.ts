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
});
