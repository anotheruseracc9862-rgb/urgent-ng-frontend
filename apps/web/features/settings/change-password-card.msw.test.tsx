import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { ChangePasswordCard } from './change-password-card';

const session = vi.hoisted(() => ({ hasPassword: true }));
vi.mock('@/lib/auth/client', () => ({ useSession: () => ({ me: { id: 'u1', hasPassword: session.hasPassword } }) }));

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ChangePasswordCard /></QueryClientProvider>);
}

const fill = async (user: ReturnType<typeof userEvent.setup>, current: string, next: string, again: string) => {
  await user.type(screen.getByLabelText('Current password'), current);
  await user.type(screen.getByLabelText('New password'), next);
  await user.type(screen.getByLabelText('Confirm new password'), again);
};

beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); session.hasPassword = true; });
afterAll(() => server.close());

describe('changing the password', () => {
  it('says other devices are signed out, and sends only the two passwords', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(http.post('*/api/v1/me/password', async ({ request }) => { body = await request.json(); return new HttpResponse(null, { status: 204 }); }));
    renderCard();
    expect(screen.getByText(/signs you out of every other device/)).toBeInTheDocument();

    await fill(user, 'old-password-1', 'new-password-2', 'new-password-2');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => expect(body).toEqual({ currentPassword: 'old-password-1', newPassword: 'new-password-2' }));
    expect(await screen.findByText('Password changed. Your other devices were signed out.')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password')).toHaveValue('');
  });

  it('will not send until the new password is long enough, different, and typed twice the same', async () => {
    const user = userEvent.setup();
    renderCard();
    const button = screen.getByRole('button', { name: 'Change password' });
    expect(button).toBeDisabled();

    await fill(user, 'old-password-1', 'short', 'short');
    expect(button).toBeDisabled();
    expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('New password'));
    await user.clear(screen.getByLabelText('Confirm new password'));
    await user.type(screen.getByLabelText('New password'), 'old-password-1');
    await user.type(screen.getByLabelText('Confirm new password'), 'old-password-1');
    expect(screen.getByText('Choose a password different from your current one.')).toBeInTheDocument();
    expect(button).toBeDisabled();

    await user.clear(screen.getByLabelText('New password'));
    await user.type(screen.getByLabelText('New password'), 'new-password-2');
    expect(screen.getByText('The two passwords do not match.')).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('says plainly when the current password is wrong', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/api/v1/me/password', () => HttpResponse.json({ error: { code: 'INVALID_CREDENTIALS', message: 'no' }, requestId: 'r' }, { status: 401 })));
    renderCard();

    await fill(user, 'wrong-password', 'new-password-2', 'new-password-2');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Your current password is not right.')).toBeInTheDocument();
  });

  it('has no form for an account that signs in with Google', () => {
    session.hasPassword = false;
    renderCard();
    expect(screen.getByText(/You sign in with Google, so there is no password to change/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change password' })).toBeNull();
  });
});
