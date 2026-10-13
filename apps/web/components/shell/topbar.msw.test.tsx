import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { Topbar } from './topbar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/dashboard',
}));

const me: Me = {
  id: 'user-1',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+2348031234567',
  phoneVerified: true,
  email: null,
  emailVerified: false,
  status: 'ACTIVE',
  startMode: 'REQUESTER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2025-03-10T00:00:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-topbar' });

function renderTopbar(mode: 'REQUESTER' | 'RUNNER') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>
        <Topbar mode={mode} />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe('business topbar', () => {
  it('provides requester search and a real notification preview', async () => {
    server.use(
      http.get('*/api/v1/notifications/unread-count', () => envelope({ count: 1 })),
      http.get('*/api/v1/notifications', () => envelope([{
        id: 'notification-1',
        category: 'TRANSACTIONAL',
        type: 'offer.new',
        title: 'A runner sent you an offer',
        body: 'Review the amount and runner details.',
        data: {},
        readAt: null,
        createdAt: '2026-01-01T10:00:00.000Z',
      }])),
    );

    renderTopbar('REQUESTER');

    const searches = await screen.findAllByRole('search');
    expect(searches.some((search) => search.getAttribute('action') === '/errands')).toBe(true);
    expect(screen.getAllByRole('searchbox', { name: 'Search my errands' })).toHaveLength(2);
    fireEvent.click(await screen.findByLabelText(/Notifications/));
    expect(await screen.findByText('A runner sent you an offer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View notifications' })).toHaveAttribute('href', '/notifications');
  });

  it('routes runner search to the marketplace', () => {
    renderTopbar('RUNNER');
    expect(screen.getAllByRole('search').some((search) => search.getAttribute('action') === '/marketplace')).toBe(true);
    expect(screen.getAllByRole('searchbox', { name: 'Search marketplace errands' })).toHaveLength(2);
  });

  it('renders a mobile breadcrumb for the current dashboard', () => {
    renderTopbar('REQUESTER');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(/Requester\s*›\s*Dashboard/);
  });
});
