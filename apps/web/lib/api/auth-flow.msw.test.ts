import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { apiError, listen, server } from '@/test/msw/server';
import { authApi } from './auth';
import { describeAuthError } from '@/features/auth/auth-ui';
import { isApiError } from './client';

/**
 * F0-10 sample flow: register, verify the one-time code, log in and read `/me`, through the real
 * API client against handlers built from `backend/openapi.json`.
 */

const envelope = (data: unknown, status = 200) =>
  HttpResponse.json({ data, meta: {}, requestId: 'req-msw' }, { status });

beforeAll(() => listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('auth flow against the contract handlers', () => {
  it('registers, verifies, logs in and reads the profile', async () => {
    const seen: string[] = [];
    server.use(
      http.post('*/api/v1/auth/register', async ({ request }) => {
        seen.push('register');
        const body = (await request.json()) as { phone?: string };
        expect(body.phone).toBe('+2348031234567');
        return envelope({ verifyVia: 'sms' }, 201);
      }),
      http.post('*/api/v1/auth/otp/verify', () => {
        seen.push('verify');
        return envelope({ verified: true });
      }),
      http.post('*/api/v1/auth/login', () => {
        seen.push('login');
        return envelope({ accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });
      }),
      http.get('*/api/v1/me', () => {
        seen.push('me');
        return envelope({ id: 'u1', name: 'Ada', startMode: 'REQUESTER' });
      }),
    );

    await authApi.register({
      name: 'Ada',
      phone: '+2348031234567',
      password: 'correct horse',
      consents: [{ type: 'TERMS', version: '1' }],
    } as Parameters<typeof authApi.register>[0]);
    expect(await authApi.verifyOtp({ phone: '+2348031234567', code: '123456' })).toEqual({ verified: true });
    await authApi.login({ phone: '+2348031234567', password: 'correct horse' });
    const me = await authApi.me();

    expect(me).toMatchObject({ id: 'u1', name: 'Ada' });
    expect(seen).toEqual(['register', 'verify', 'login', 'me']);
  });

  it('keeps the stable code and details of a wrong one-time code', async () => {
    server.use(
      http.post('*/api/v1/auth/otp/verify', () =>
        apiError(400, 'OTP_INVALID', 'That code is not right.', { attemptsLeft: 2 }),
      ),
    );

    const error = await authApi.verifyOtp({ phone: '+2348031234567', code: '000000' }).catch((e: unknown) => e);

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 400, code: 'OTP_INVALID', details: { attemptsLeft: 2 } });
  });

  it('does not leak the one-time code into the request URL', async () => {
    let url = '';
    server.use(
      http.post('*/api/v1/auth/otp/verify', ({ request }) => {
        url = request.url;
        return envelope({ verified: true });
      }),
    );

    await authApi.verifyOtp({ phone: '+2348031234567', code: '654321' });

    expect(url).not.toContain('654321');
    expect(new URL(url).search).toBe('');
  });

  it('refreshes once on an expired access token and replays the request', async () => {
    const seen: string[] = [];
    let meCalls = 0;
    server.use(
      http.get('*/api/v1/me', () => {
        meCalls += 1;
        seen.push(`me#${meCalls}`);
        return meCalls === 1
          ? apiError(401, 'AUTH_REQUIRED', 'Sign in to continue.')
          : envelope({ id: 'u1', name: 'Ada' });
      }),
      http.post('*/api/v1/auth/refresh', () => {
        seen.push('refresh');
        return envelope({ refreshed: true });
      }),
    );

    const me = await authApi.me();

    expect(me).toMatchObject({ id: 'u1' });
    expect(seen).toEqual(['me#1', 'refresh', 'me#2']);
  });

  it('shows a lockout with the wait from the backend', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          { error: { code: 'ACCOUNT_LOCKED', message: 'Locked.' }, requestId: 'r' },
          { status: 423, headers: { 'Retry-After': '900' } },
        ),
      ),
    );

    const error = await authApi.login({ phone: '+2348031234567', password: 'x' }).catch((e: unknown) => e);

    expect(isApiError(error)).toBe(true);
    expect(describeAuthError(error)).toBe('Too many wrong attempts. Try again in 15 minutes.');
  });

  it('resets a password with the emailed code and logs out', async () => {
    const seen: string[] = [];
    server.use(
      http.post('*/api/v1/auth/password/forgot', () => {
        seen.push('forgot');
        return envelope({ sent: true });
      }),
      http.post('*/api/v1/auth/password/reset', async ({ request }) => {
        seen.push('reset');
        expect(await request.json()).toMatchObject({ email: 'ada@example.com', code: '123456' });
        return envelope({ reset: true });
      }),
      http.post('*/api/v1/auth/logout', () => {
        seen.push('logout');
        return envelope({ loggedOut: true });
      }),
    );

    await authApi.forgot({ email: 'ada@example.com' });
    await authApi.reset({ email: 'ada@example.com', code: '123456', newPassword: 'a new password' });
    await authApi.logout();

    expect(seen).toEqual(['forgot', 'reset', 'logout']);
  });
});
