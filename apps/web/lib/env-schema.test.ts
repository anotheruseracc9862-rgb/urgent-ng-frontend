import { describe, expect, it } from 'vitest';
import { parseWebEnvironment } from './env-schema';

describe('parseWebEnvironment', () => {
  it.each(['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_APP_URL'])(
    'rejects a missing %s variable by name',
    (name) => {
      const source: Record<string, string | undefined> = {
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4000/api/v1',
        NEXT_PUBLIC_APP_URL: 'http://localhost:4001',
      };
      delete source[name];

      expect(() => parseWebEnvironment(source)).toThrow(name);
    },
  );

  it('rejects malformed URLs by variable name', () => {
    expect(() =>
      parseWebEnvironment({
        NEXT_PUBLIC_API_URL: 'not a URL',
        NEXT_PUBLIC_APP_URL: 'http://localhost:4001',
      }),
    ).toThrow('NEXT_PUBLIC_API_URL');
  });

  it('allows provider keys to be omitted until those integrations are configured', () => {
    expect(
      parseWebEnvironment({
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4000/api/v1',
        NEXT_PUBLIC_APP_URL: 'http://localhost:4001',
      }).NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    ).toBe('');
  });
});
