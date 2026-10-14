import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';
import { listen, server } from '@/test/msw/server';
import { AccountLifecyclePage } from './account-lifecycle-page';

const { replace, refresh } = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

const me: Me = {
  id: 'user-account-1',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+2348031234567',
  phoneVerified: true,
  email: null,
  emailVerified: false,
  hasPassword: true,
  googleLinked: false,
  status: 'ACTIVE',
  startMode: 'RUNNER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2025-03-10T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider me={me}>
        <AccountLifecyclePage />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

beforeAll(() => listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
  replace.mockClear();
  refresh.mockClear();
});
afterAll(() => server.close());

describe('account lifecycle settings', () => {
  it('shows deletion blockers and the link to resolve an active assignment', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/api/v1/me/delete-request', () => HttpResponse.json({
      error: {
        code: 'DELETION_BLOCKED',
        message: 'Account deletion is blocked.',
        details: { blockers: [{ code: 'ACTIVE_ASSIGNMENT', message: 'Finish your active errand.' }] },
      },
      requestId: 'req-delete-blocked',
    }, { status: 409 })));
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    await user.click(screen.getByRole('button', { name: 'Request deletion' }));

    expect(await screen.findByText('Finish your active errand.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View errands' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText(/req-delete-blocked/)).toBeInTheDocument();
  });

  it('shows the backend grace-period date and redirects after a successful deletion request', async () => {
    const user = userEvent.setup();
    const scheduledAt = '2026-10-27T21:00:00.000Z';
    server.use(http.post('*/api/v1/me/delete-request', () => HttpResponse.json({
      data: { status: 'DELETION_PENDING', deletionScheduledAt: scheduledAt },
      meta: {},
      requestId: 'req-delete',
    })));
    const { queryClient } = renderPage();

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    await user.click(screen.getByRole('button', { name: 'Request deletion' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/account/standing'));
    expect(queryClient.getQueryData<Me>(queryKeys.auth.me(me.id))).toMatchObject({
      status: 'DELETION_PENDING',
      deletionScheduledAt: scheduledAt,
    });
    expect(refresh).toHaveBeenCalled();
  });

  it('posts deactivation and sends the user to account standing', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/api/v1/me/deactivate', () => HttpResponse.json({
      data: { status: 'DEACTIVATED' },
      meta: {},
      requestId: 'req-deactivate',
    })));
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Deactivate account' }));
    await user.click(screen.getByRole('button', { name: 'Deactivate', exact: true }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/account/standing'));
  });
});
