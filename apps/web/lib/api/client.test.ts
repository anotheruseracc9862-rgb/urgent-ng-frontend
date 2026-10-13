import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, safeRedirect } from './client';
import { toIdentifier } from './auth';

function respond(status: number, body: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('api()', () => {
  it('unwraps the { data } envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, { data: { id: 'u1' }, meta: {}, requestId: 'r' })));
    await expect(api('/me')).resolves.toEqual({ id: 'u1' });
  });

  it('turns an error envelope into ApiError with the stable code and details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respond(429, {
          error: { code: 'ACCOUNT_LOCKED', message: 'Locked', details: { retryAfterSeconds: 540 } },
          requestId: 'req_1',
        }),
      ),
    );
    const error = await api('/auth/login', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('ACCOUNT_LOCKED');
    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(540);
    expect(error.requestId).toBe('req_1');
  });

  it('reports a network failure as NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')));
    await expect(api('/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('refreshes once on 401 AUTH_REQUIRED, then retries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(401, { error: { code: 'AUTH_REQUIRED', message: 'x' } }))
      .mockResolvedValueOnce(respond(200, { data: { expiresIn: 900 } }))
      .mockResolvedValueOnce(respond(200, { data: { id: 'u1' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api('/me')).resolves.toEqual({ id: 'u1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/auth/refresh');
  });

  it('gives up when the refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(401, { error: { code: 'AUTH_REQUIRED', message: 'x' } }))
      .mockResolvedValueOnce(respond(401, { error: { code: 'AUTH_REQUIRED', message: 'x' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api('/me')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('safeRedirect()', () => {
  it('allows same-site paths', () => {
    expect(safeRedirect('/errands/123?tab=offers')).toBe('/errands/123?tab=offers');
  });
  it('rejects other origins and protocol-relative URLs', () => {
    expect(safeRedirect('https://evil.example')).toBe('/dashboard');
    expect(safeRedirect('//evil.example')).toBe('/dashboard');
    expect(safeRedirect('/\\evil.example')).toBe('/dashboard');
    expect(safeRedirect(null)).toBe('/dashboard');
  });
});

describe('toIdentifier()', () => {
  it('sends email lowercased and trimmed', () => {
    expect(toIdentifier('  Ada@Example.com ')).toEqual({ email: 'ada@example.com' });
  });
  it('sends anything else as phone', () => {
    expect(toIdentifier('0803 123 4567')).toEqual({ phone: '0803 123 4567' });
  });
});
