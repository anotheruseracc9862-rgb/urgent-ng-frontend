import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { MyErrandsPage } from './my-errands-page';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/errands',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const me: Me = {
  id: 'requester-1',
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
  startMode: 'REQUESTER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2025-03-10T00:00:00.000Z',
};

const summary = {
  asRequester: {
    errandsThisMonth: 4,
    completedThisMonth: 2,
    openErrands: 3,
    activeErrands: 1,
    successRate: 0.8,
    errandsWithOffers: 1,
    offersToReview: 2,
    awaitingRunnerAcceptance: 0,
    deliveriesToConfirm: 1,
    changeRequestsToAnswer: 0,
  },
  asRunner: {
    activeAssignments: 0,
    selectedAwaitingYou: 0,
    activeOffers: 0,
    offersAwaitingYou: 0,
    offersThisWeek: 0,
    completedLast30Days: 0,
    changeRequestsToAnswer: 0,
  },
  recentActivity: [],
};

const summaryErrand = {
  id: 'errand-summary-1',
  title: 'Deliver a parcel',
  status: 'EXPIRED',
  category: { id: 'category-1', key: 'delivery', name: 'Delivery' },
  priority: 'STANDARD',
  timeMode: 'ASAP',
  scheduledAt: null,
  suggestedBudgetMinor: 500000,
  pickupArea: 'Ikeja',
  destinationArea: 'Magodo',
  publishedAt: '2026-10-13T10:00:00.000Z',
  expiresAt: '2026-10-14T10:00:00.000Z',
  offerCount: 2,
  createdAt: '2026-10-13T10:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
};

const envelope = (data: unknown, meta: unknown = {}) => HttpResponse.json({
  data,
  meta,
  requestId: 'req-my-errands',
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>
        <MyErrandsPage />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  push.mockClear();
  replace.mockClear();
  window.history.replaceState({}, '', '/');
});
afterAll(() => server.close());

describe('my errands page', () => {
  it('loads the URL-selected tab, search, and sort, then updates the URL from filters', async () => {
    const user = userEvent.setup();
    let requestParams = new URLSearchParams();
    window.history.replaceState({}, '', '/errands?tab=PAST&sort=HIGHEST_AMOUNT&q=parcel');
    server.use(
      http.get('*/api/v1/me/summary', () => envelope(summary)),
      http.get('*/api/v1/errands/mine', ({ request }) => {
        requestParams = new URL(request.url).searchParams;
        return envelope([summaryErrand]);
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'My errands' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Deliver a parcel' })).toBeInTheDocument();
    await waitFor(() => {
      expect(requestParams.get('tab')).toBe('PAST');
      expect(requestParams.get('sort')).toBe('HIGHEST_AMOUNT');
      expect(requestParams.get('q')).toBe('parcel');
    });

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(push).toHaveBeenCalledWith('/errands?tab=OPEN&sort=HIGHEST_AMOUNT&q=parcel', { scroll: false });
    await user.selectOptions(screen.getByLabelText('Sort'), 'RECENT');
    expect(push).toHaveBeenLastCalledWith('/errands?tab=PAST&sort=RECENT&q=parcel', { scroll: false });

    const search = screen.getByRole('searchbox', { name: 'Search errands' });
    await user.clear(search);
    await user.type(search, 'package');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/errands?tab=PAST&sort=HIGHEST_AMOUNT&q=package', { scroll: false }), { timeout: 2000 });
  });

  it('shows a useful empty state and a next action', async () => {
    server.use(
      http.get('*/api/v1/me/summary', () => envelope(summary)),
      http.get('*/api/v1/errands/mine', () => envelope([])),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'No errands here' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Post an errand' }).every((link) => link.getAttribute('href') === '/errands/new')).toBe(true);
  });

  it('loads additional cursor pages without losing the first page', async () => {
    const user = userEvent.setup();
    let cursorSeen: string | null = null;
    server.use(
      http.get('*/api/v1/me/summary', () => envelope(summary)),
      http.get('*/api/v1/errands/mine', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor) {
          cursorSeen = cursor;
          return envelope([{ ...summaryErrand, id: 'errand-summary-2', title: 'Pick up another parcel' }]);
        }
        return envelope([summaryErrand], { nextCursor: 'cursor-next' });
      }),
    );

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Deliver a parcel' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load more errands' }));

    expect(await screen.findByRole('heading', { name: 'Pick up another parcel' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Deliver a parcel' })).toBeInTheDocument();
    expect(cursorSeen).toBe('cursor-next');
  });
});
