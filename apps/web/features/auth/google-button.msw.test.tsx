import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useEffect } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError, listen, server } from '@/test/msw/server';

/**
 * F1-09: the Google Identity Services callback hands an ID token to `POST /auth/google`. A test
 * token stands in for the real credential; a real-account check stays a manual step.
 */

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/script', () => {
  function Script({ onLoad }: { onLoad?: () => void }) {
    useEffect(() => onLoad?.(), [onLoad]);
    return null;
  }
  return { default: Script };
});

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-msw' });
const POLICIES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'SAFETY_POLICY',
  'PROHIBITED_ITEMS_POLICY',
  'OFFLINE_PAYMENT_TERMS',
].map((type) => ({ type, version: '2026-01', publishedAt: '2026-01-01T00:00:00.000Z' }));

let credentialCallback: ((r: { credential: string }) => void) | undefined;

function installGoogle() {
  window.google = {
    accounts: {
      id: {
        initialize: ({ callback }) => {
          credentialCallback = callback;
        },
        renderButton: vi.fn(),
      },
    },
  };
}

async function renderButton() {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com');
  vi.resetModules();
  const { GoogleButton } = await import('./google-button');
  render(<GoogleButton redirect="/dashboard" />);
  await waitFor(() => expect(credentialCallback).toBeDefined());
}

beforeAll(() => listen());
beforeEach(() => {
  credentialCallback = undefined;
  replace.mockClear();
  installGoogle();
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe('GoogleButton', () => {
  it('signs an existing user in with the ID token and routes to the destination', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/v1/auth/google', async ({ request }) => {
        body = await request.json();
        return envelope({ status: 'ACTIVE', isNewAccount: false, accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });
      }),
      http.get('*/api/v1/me', () => envelope({ id: 'u1', name: 'Ada', startMode: 'REQUESTER', status: 'ACTIVE' })),
    );
    await renderButton();

    await act(async () => credentialCallback?.({ credential: 'test-id-token' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(body).toMatchObject({ idToken: 'test-id-token' });
    expect(body).not.toHaveProperty('consents');
  });

  it('collects the policy consents for a new Google user, then sends the token again with them', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post('*/api/v1/auth/google', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        bodies.push(body);
        if (!body.consents) return apiError(409, 'GOOGLE_SIGNUP_REQUIRED', 'Accept the policies to continue.');
        return envelope({ status: 'ACTIVE', isNewAccount: true, accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });
      }),
      http.get('*/api/v1/reference/policies', () => envelope(POLICIES)),
      http.get('*/api/v1/me', () => envelope({ id: 'u2', name: 'Bayo', startMode: null, status: 'ACTIVE' })),
    );
    await renderButton();

    await act(async () => credentialCallback?.({ credential: 'new-user-token' }));
    const user = userEvent.setup();
    await user.click(await screen.findByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding'));
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toMatchObject({ idToken: 'new-user-token' });
    expect(bodies[1]?.consents).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'TERMS_OF_SERVICE', version: '2026-01' })]),
    );
  });

  it('hides the button when the provider is unavailable', async () => {
    server.use(
      http.post('*/api/v1/auth/google', () =>
        apiError(503, 'SIGN_IN_PROVIDER_UNAVAILABLE', 'Google sign-in is unavailable.'),
      ),
    );
    await renderButton();

    await act(async () => credentialCallback?.({ credential: 'test-id-token' }));

    await waitFor(() => expect(document.querySelector('[aria-busy]')).toBeNull());
  });
});
