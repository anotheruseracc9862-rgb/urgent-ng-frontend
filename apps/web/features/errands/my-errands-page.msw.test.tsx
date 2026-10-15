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

  it('shows tab counts, the lowest offer with who offered, and the selected runner', async () => {
    server.use(
      http.get('*/api/v1/me/summary', () => envelope(summary)),
      http.get('*/api/v1/errands/mine/counts', () => envelope({ all: 9, attention: 2, open: 3, active: 1, past: 4, draft: 1 })),
      http.get('*/api/v1/errands/mine', () => envelope([
        {
          ...summaryErrand,
          id: 'errand-open',
          title: 'Pick up cake',
          status: 'OPEN',
          offerCount: 2,
          expiresAt: new Date(Date.now() + 5 * 3_600_000).toISOString(),
          lowestOfferMinor: 400_000,
          offerPreview: [{ firstName: 'Tunde', lastName: 'Okon', photoMediaId: null }, { firstName: 'Chioma', lastName: 'Eze', photoMediaId: null }],
          runner: null, agreedAmountMinor: null, attention: 'OFFERS', attentionExpiresAt: null,
        },
        {
          ...summaryErrand,
          id: 'errand-active',
          title: 'Collect fabric',
          status: 'PICKED_UP',
          offerCount: 3,
          lowestOfferMinor: null,
          offerPreview: [],
          runner: { firstName: 'Blessing', lastName: 'Adeleke', photoMediaId: null, rating: 4.7, ratingCount: 9, completedErrands: 18 },
          agreedAmountMinor: 400_000, attention: null, attentionExpiresAt: null,
        },
      ])),
    );

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SessionProvider me={me}><MyErrandsPage /></SessionProvider></QueryClientProvider>);

    expect(await screen.findByText('Pick up cake')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Needs attention/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /^All/ })).toHaveTextContent('9');
    expect(screen.getByText(/Lowest ₦4,000/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review 2 offers' })).toHaveAttribute('href', '/errands/errand-open');
    expect(screen.getByText('Blessing A.')).toBeInTheDocument();
    expect(screen.getByText(/★ 4.7 · 18 errands/)).toBeInTheDocument();
    expect(screen.getByText(/agreed · paid directly/)).toBeInTheDocument();
  });

  it('flags a delivery to confirm and an errand that is about to close', async () => {
    server.use(
      http.get('*/api/v1/me/summary', () => envelope(summary)),
      http.get('*/api/v1/errands/mine/counts', () => envelope({ all: 2, attention: 2, open: 1, active: 1, past: 0, draft: 0 })),
      http.get('*/api/v1/errands/mine', () => envelope([
        {
          ...summaryErrand, id: 'errand-delivered', title: 'Inhaler run', status: 'DELIVERED',
          offerPreview: [], lowestOfferMinor: null,
          runner: { firstName: 'Fatima', lastName: 'Garba', photoMediaId: null, rating: 4.9, ratingCount: 30, completedErrands: 41 },
          agreedAmountMinor: 350_000, attention: 'DELIVERY', attentionExpiresAt: null,
        },
        {
          ...summaryErrand, id: 'errand-closing', title: 'Generator check', status: 'OPEN', offerCount: 1,
          offerPreview: [{ firstName: 'Bola', lastName: null, photoMediaId: null }], lowestOfferMinor: 550_000,
          runner: null, agreedAmountMinor: null, attention: 'EXPIRING',
          attentionExpiresAt: new Date(Date.now() + 50 * 60_000).toISOString(),
          expiresAt: new Date(Date.now() + 50 * 60_000).toISOString(),
        },
      ])),
    );

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SessionProvider me={me}><MyErrandsPage /></SessionProvider></QueryClientProvider>);

    expect(await screen.findByText(/Fatima delivered it/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Confirm delivery' })).toBeInTheDocument();
    expect(screen.getByText(/Closes in 4\d min · extend it once, or boost it/)).toBeInTheDocument();
  });
});
