import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { Topbar } from './topbar';

const navigation = vi.hoisted(() => ({ pathname: '/dashboard' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => navigation.pathname,
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
  navigation.pathname = '/dashboard';
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
    for (const crumb of screen.getAllByRole('navigation', { name: 'Breadcrumb' })) {
      expect(crumb).toHaveTextContent(/Requester\s*›\s*Dashboard/);
    }
  });

  it('shows the assignment trail on desktop and mobile, with a link back to the assignment', () => {
    navigation.pathname = '/assignments/515cf6e5-09e7-560c-b89a-3dfee04a9368/run';
    renderTopbar('RUNNER');
    for (const crumb of screen.getAllByRole('navigation', { name: 'Breadcrumb' })) {
      expect(crumb).toHaveTextContent(/Runner\s*›\s*Active tasks\s*›\s*Assignment\s*›\s*Run errand/);
      expect(within(crumb).getByRole('link', { name: 'Assignment' })).toHaveAttribute('href', '/assignments/515cf6e5-09e7-560c-b89a-3dfee04a9368');
      expect(within(crumb).getByRole('link', { name: 'Active tasks' })).toHaveAttribute('href', '/assignments');
    }
  });

  it('a requester on an assignment sees My errands, not Active tasks', () => {
    navigation.pathname = '/assignments/515cf6e5-09e7-560c-b89a-3dfee04a9368';
    renderTopbar('REQUESTER');
    for (const crumb of screen.getAllByRole('navigation', { name: 'Breadcrumb' })) {
      expect(crumb).toHaveTextContent(/Requester\s*›\s*My errands\s*›\s*Assignment/);
      expect(crumb).not.toHaveTextContent('Active tasks');
    }
  });

  it('shows the marketplace detail hierarchy without exposing the errand id on desktop and mobile', () => {
    navigation.pathname = '/marketplace/c82687f7-edc3-59d6-934e-3aea6684e1d7';
    renderTopbar('RUNNER');
    for (const crumb of screen.getAllByRole('navigation', { name: 'Breadcrumb' })) {
      expect(crumb).toHaveTextContent(/Runner\s*›\s*Find errands\s*›\s*Errand details/);
      expect(within(crumb).getByRole('link', { name: 'Find errands' })).toHaveAttribute('href', '/marketplace');
      expect(within(crumb).getByText('Errand details')).toHaveAttribute('aria-current', 'page');
      expect(crumb).not.toHaveTextContent('c82687f7');
    }
  });

  it.each(['REQUESTER', 'RUNNER'] as const)('shows offer details under the correct %s workspace on desktop and mobile', (mode) => {
    navigation.pathname = '/offers/ec79ce0f-a34e-5e3b-9f2a-932a0454b56b';
    renderTopbar(mode);
    for (const crumb of screen.getAllByRole('navigation', { name: 'Breadcrumb' })) {
      expect(within(crumb).getByRole('link', { name: mode === 'RUNNER' ? 'My offers' : 'My errands' })).toHaveAttribute('href', mode === 'RUNNER' ? '/offers' : '/errands');
      expect(within(crumb).getByText('Offer details')).toHaveAttribute('aria-current', 'page');
      expect(crumb).not.toHaveTextContent('ec79ce0f');
    }
  });

  it.each(['REQUESTER', 'RUNNER'] as const)('shows the settings hierarchy for %s on desktop and mobile', (mode) => {
    const settingsPages = [
      ['/settings/contact', 'Contact methods'],
      ['/settings/notifications', 'Notifications'],
      ['/settings/privacy', 'Privacy'],
      ['/settings/security', 'Security'],
      ['/settings/blocked', 'Blocked people'],
      ['/settings/account', 'Account'],
    ] as const;

    for (const [pathname, title] of settingsPages) {
      navigation.pathname = pathname;
      const { unmount } = renderTopbar(mode);
      const crumbs = screen.getAllByRole('navigation', { name: 'Breadcrumb' });
      expect(crumbs).toHaveLength(2);
      for (const crumb of crumbs) {
        expect(crumb).toHaveTextContent(new RegExp(`${mode === 'REQUESTER' ? 'Requester' : 'Runner'}\\s*›\\s*Settings\\s*›\\s*${title}`));
        expect(within(crumb).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
        expect(within(crumb).getByText(title)).toHaveAttribute('aria-current', 'page');
      }
      unmount();
    }
  });

  it.each(['REQUESTER', 'RUNNER'] as const)('shows the profile hierarchy for orders in %s mode', (mode) => {
    navigation.pathname = '/profile/orders';
    renderTopbar(mode);
    for (const crumb of screen.getAllByRole('navigation', { name: 'Breadcrumb' })) {
      expect(crumb).toHaveTextContent(new RegExp(`${mode === 'REQUESTER' ? 'Requester' : 'Runner'}\\s*›\\s*Profile & account\\s*›\\s*Orders and receipts`));
      expect(within(crumb).getByRole('link', { name: 'Profile & account' })).toHaveAttribute('href', '/profile');
      expect(within(crumb).getByText('Orders and receipts')).toHaveAttribute('aria-current', 'page');
    }
  });
});
