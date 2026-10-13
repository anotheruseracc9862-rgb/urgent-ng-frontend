import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { apiError, listen, server } from '@/test/msw/server';
import { readPendingVerify, clearPendingIdentity } from '@/lib/auth/pending-identity';
import { RegisterForm } from './register-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/register',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/script', () => ({ default: () => null }));

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-msw' });
const POLICIES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'SAFETY_POLICY',
  'PROHIBITED_ITEMS_POLICY',
  'OFFLINE_PAYMENT_TERMS',
].map((type) => ({ type, version: '2026-01', publishedAt: '2026-01-01T00:00:00.000Z' }));

beforeAll(() => listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
  push.mockClear();
  clearPendingIdentity();
});
afterAll(() => server.close());

async function fillAndSubmit() {
  const user = userEvent.setup();
  render(<RegisterForm />);
  await user.type(screen.getByLabelText('Full name'), 'Ada Obi');
  await user.type(screen.getByLabelText('Phone number'), '08031234567');
  await user.type(screen.getByLabelText('Password'), 'correct horse');
  await user.type(screen.getByLabelText('Confirm password'), 'correct horse');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /create account|continue|sign up/i }));
  return user;
}

describe('RegisterForm with an identifier that already has an account', () => {
  it('offers sign in and a new code instead of creating a second account', async () => {
    const resent: unknown[] = [];
    server.use(
      http.get('*/api/v1/reference/policies', () => envelope(POLICIES)),
      http.post('*/api/v1/auth/register', () => apiError(409, 'IDENTIFIER_TAKEN', 'Taken.')),
      http.post('*/api/v1/auth/otp/resend', async ({ request }) => {
        resent.push(await request.json());
        return envelope({ sent: true });
      }),
    );

    const user = await fillAndSubmit();

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent(/already has an account/i);
    expect(within(notice).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');

    await user.click(screen.getByRole('button', { name: 'send a new code' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/verify'));
    expect(resent).toEqual([{ phone: '+2348031234567' }]);
    expect(readPendingVerify()).toMatchObject({ via: 'phone', phone: '+2348031234567' });
  });
});
