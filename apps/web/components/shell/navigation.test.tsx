import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';
import { accountMenuFor, assignmentBreadcrumbs, hrefFor, isItemActive, itemsFor, primaryItemsFor, titleForPath, NAV_ITEMS } from './nav-items';

const navigation = vi.hoisted(() => ({ pathname: '/dashboard', search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const me = { id: 'u1', name: 'Ada Lovelace', firstName: 'Ada', startMode: 'REQUESTER' } as unknown as Me;
const envelope = (data: unknown, meta: unknown = {}) => HttpResponse.json({ data, meta, requestId: 'req-nav' });

function renderWithApp(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>{node}</SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); navigation.pathname = '/dashboard'; navigation.search = ''; });
afterAll(() => server.close());

describe('shell navigation model', () => {
  it('keeps the demo rail short and mode specific', () => {
    expect(itemsFor('REQUESTER').map(({ label }) => label)).toEqual([
      'Dashboard', 'My errands', 'Track errand', 'Messages', 'Notifications', 'Settings', 'Profile & account',
    ]);
    expect(itemsFor('RUNNER').map(({ label }) => label)).toEqual([
      'Dashboard', 'Find errands', 'My offers', 'Active task', 'Messages', 'Notifications', 'Settings', 'Profile & account',
    ]);
  });

  it('moves the extra places into the account menu', () => {
    const requester = accountMenuFor('REQUESTER').map(({ label }) => label);
    const runner = accountMenuFor('RUNNER').map(({ label }) => label);
    expect(requester).toEqual(expect.arrayContaining(['Reviews', 'Boosts', 'Notification settings', 'Safety & support', 'Help centre']));
    expect(requester).not.toContain('Settings');
    expect(runner).not.toContain('Settings');
    expect(requester).not.toContain('Job history');
    expect(runner).toEqual(expect.arrayContaining(['Job history', 'Saved errands', 'Verification', 'Runner Pro', 'Reviews']));
    expect(runner).not.toContain('Boosts');
  });

  it('shows five primary mobile items in each mode', () => {
    expect(primaryItemsFor('REQUESTER')).toHaveLength(5);
    expect(primaryItemsFor('RUNNER')).toHaveLength(5);
  });

  it('sends "Track errand" to the tracking page, not the errands list', () => {
    const mine = NAV_ITEMS.find((item) => item.label === 'My errands')!;
    const track = NAV_ITEMS.find((item) => item.label === 'Track errand')!;
    expect(hrefFor(track)).toBe('/track');
    expect(isItemActive(track, '/track', new URLSearchParams())).toBe(true);
    expect(isItemActive(track, '/assignments/a1/track', new URLSearchParams())).toBe(true);
    expect(isItemActive(mine, '/track', new URLSearchParams())).toBe(false);
    expect(isItemActive(mine, '/errands/e1', new URLSearchParams())).toBe(true);
    expect(isItemActive(track, '/errands', new URLSearchParams('tab=ACTIVE'))).toBe(false);
  });

  it('derives a stable breadcrumb for nested routes without displaying record ids', () => {
    expect(titleForPath('/settings/contact')).toBe('Contact methods');
    expect(titleForPath('/settings/notifications')).toBe('Notifications');
    expect(titleForPath('/profile/orders')).toBe('Orders and receipts');
    expect(titleForPath('/settings/privacy')).toBe('Privacy');
    expect(titleForPath('/settings/security')).toBe('Security');
    expect(titleForPath('/settings/blocked')).toBe('Blocked people');
    expect(titleForPath('/settings/account')).toBe('Account');
    expect(titleForPath('/errands/12345')).toBe('My errands');
    expect(titleForPath('/verification/attempt')).toBe('Verification');
    expect(titleForPath('/runner/history')).toBe('Job history');
  });
});

describe('mobile bottom navigation', () => {
  it.each([
    ['REQUESTER', ['Dashboard', 'My errands', 'Track errand', 'Messages', 'Profile']],
    ['RUNNER', ['Dashboard', 'Find errands', 'Active task', 'Messages', 'Profile']],
  ] as const)('renders five items for %s mode', (mode, labels) => {
    renderWithApp(<BottomNav mode={mode} />);
    const navigation = screen.getByRole('navigation', { name: 'Main' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(5);
    for (const label of labels) expect(within(navigation).getByText(label)).toBeInTheDocument();
  });
});

describe('desktop rail', () => {
  it('shows the requester rail with a post action, counts and the account menu', async () => {
    navigation.pathname = '/settings/notifications';
    server.use(
      http.get('*/me/summary', () => envelope({
        asRequester: { openErrands: 3, activeErrands: 1, errandsThisMonth: 0, completedThisMonth: 0, successRate: null, errandsWithOffers: 0, offersToReview: 0, awaitingRunnerAcceptance: 0, deliveriesToConfirm: 0, changeRequestsToAnswer: 0 },
        asRunner: { activeAssignments: 0, selectedAwaitingYou: 0, activeOffers: 0, offersAwaitingYou: 0, offersThisWeek: 0, completedLast30Days: 0, changeRequestsToAnswer: 0 },
        recentActivity: [],
      })),
      http.get('*/notifications/unread-count', () => envelope({ count: 2 })),
      http.get('*/conversations', () => envelope([{ id: 'c1', unreadCount: 3 }, { id: 'c2', unreadCount: 0 }])),
    );
    renderWithApp(<Sidebar mode="REQUESTER" name="Ada Lovelace" />);
    const sidebar = screen.getByRole('complementary', { name: 'Main' });
    const main = within(sidebar).getByRole('navigation', { name: 'Main' });
    expect(within(main).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(within(main).getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    expect(within(sidebar).getByRole('link', { name: 'Post an errand' })).toHaveAttribute('href', '/errands/new');
    expect(within(sidebar).getByRole('link', { name: /Track errand/ })).toHaveAttribute('href', '/track');
    expect(within(sidebar).getByRole('navigation', { name: 'Account' })).toBeInTheDocument();
    expect(await within(sidebar).findByText('4')).toBeInTheDocument();
    expect(within(sidebar).getByText('3')).toBeInTheDocument();
    expect(within(sidebar).getByText('2')).toBeInTheDocument();

    fireEvent.keyDown(within(sidebar).getByRole('button', { name: 'Account menu' }), { key: 'Enter' });
    expect(await screen.findByRole('menuitem', { name: /Reviews/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Safety & support/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Sign out/ })).toBeInTheDocument();
  });

  it('marks the runner offline switch and lets the runner flip it', async () => {
    navigation.pathname = '/settings/notifications';
    let availability = 'UNAVAILABLE';
    server.use(
      http.get('*/runner/profile', () => envelope({ availability })),
      http.put('*/runner/availability', async ({ request }) => {
        availability = ((await request.json()) as { availability: string }).availability;
        return envelope({ availability });
      }),
      http.get('*/me/summary', () => envelope({ asRequester: {}, asRunner: { activeAssignments: 0, selectedAwaitingYou: 0, activeOffers: 0 }, recentActivity: [] })),
      http.get('*/notifications/unread-count', () => envelope({ count: 0 })),
      http.get('*/conversations', () => envelope([])),
    );
    renderWithApp(<Sidebar mode="RUNNER" name="Ada Lovelace" />);
    const sidebar = screen.getByRole('complementary', { name: 'Main' });
    const main = within(sidebar).getByRole('navigation', { name: 'Main' });
    expect(within(main).getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    // The call-to-action and the menu item both lead to the marketplace, as in the demo.
    for (const link of within(sidebar).getAllByRole('link', { name: 'Find errands' })) expect(link).toHaveAttribute('href', '/marketplace');
    expect(await within(sidebar).findByText('You are offline')).toBeInTheDocument();
    fireEvent.click(within(sidebar).getByRole('switch'));
    expect(await within(sidebar).findByText('You are online')).toBeInTheDocument();
  });
});

describe('assignmentBreadcrumbs', () => {
  const id = '515cf6e5-09e7-560c-b89a-3dfee04a9368';

  it('runner on the assignment page: Active tasks, then the page', () => {
    expect(assignmentBreadcrumbs(`/assignments/${id}`, 'RUNNER')).toEqual({
      trail: [{ label: 'Active tasks', href: '/assignments' }],
      current: 'Assignment',
    });
  });

  it('requester gets their own parent, never the runner-only Active tasks', () => {
    expect(assignmentBreadcrumbs(`/assignments/${id}`, 'REQUESTER')?.trail).toEqual([{ label: 'My errands', href: '/errands' }]);
  });

  it('a screen under the assignment links back to the assignment', () => {
    expect(assignmentBreadcrumbs(`/assignments/${id}/run`, 'RUNNER')).toEqual({
      trail: [{ label: 'Active tasks', href: '/assignments' }, { label: 'Assignment', href: `/assignments/${id}` }],
      current: 'Run errand',
    });
    expect(assignmentBreadcrumbs(`/assignments/${id}/payment`, 'REQUESTER')?.current).toBe('Payment terms');
    expect(assignmentBreadcrumbs(`/assignments/${id}/no-show`, 'RUNNER')?.current).toBe('No-show report');
    expect(assignmentBreadcrumbs(`/assignments/${id}/something-new`, 'RUNNER')?.current).toBe('Details');
  });

  it('is null for every other path, including the list itself', () => {
    expect(assignmentBreadcrumbs('/assignments', 'RUNNER')).toBeNull();
    expect(assignmentBreadcrumbs('/errands/abc', 'RUNNER')).toBeNull();
    expect(assignmentBreadcrumbs(`/assignments/${id}/run/extra`, 'RUNNER')).toBeNull();
  });
});
