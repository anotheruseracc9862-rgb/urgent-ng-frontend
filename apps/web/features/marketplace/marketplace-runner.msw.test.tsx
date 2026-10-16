import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ApiResponse } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { apiError, listen, server } from '@/test/msw/server';
import { MarketplaceFeedPage } from './feed/marketplace-feed-page';
import { MarketplacePage } from './marketplace-page';
import { MarketplaceErrandPage } from './detail/marketplace-errand-page';
import { SavedErrandsPage } from './saved/saved-errands-page';
import { RunnerHistoryPage } from '@/features/runner/history/runner-history-page';
import type { FeedItem } from './api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const envelope = (data: unknown, meta: Record<string, unknown> = {}) =>
  HttpResponse.json({ data, meta, requestId: 'req-marketplace' });

function renderWithClient(ui: React.ReactNode, client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})) {
  render(
    <QueryClientProvider client={client}>
      <SessionProvider me={{ id: 'runner-1', firstName: 'Ada', startMode: 'RUNNER' } as unknown as Me}>{ui}</SessionProvider>
    </QueryClientProvider>,
  );
  return client;
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('runner marketplace phase', () => {
  it('checks runner eligibility before mounting the feed', async () => {
    let categoryRequests = 0;
    let feedRequests = 0;
    server.use(
      http.get('*/api/v1/reference/categories', () => {
        categoryRequests += 1;
        return envelope([]);
      }),
      http.get('*/api/v1/marketplace/errands', () => {
        feedRequests += 1;
        return envelope([]);
      }),
    );

    renderWithClient(<MarketplacePage eligibility={{
      canBrowseFeed: false,
      canOffer: false,
      reasons: ['NOT_VERIFIED', 'NO_RUNNER_PROFILE'],
    }} />);

    expect(screen.getByRole('heading', { name: 'Your next errand starts here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue verification' })).toHaveAttribute('href', '/verification');
    expect(screen.queryByRole('button', { name: 'Apply filters' })).not.toBeInTheDocument();
    expect(categoryRequests).toBe(0);
    expect(feedRequests).toBe(0);
  });

  it('invites an unverified runner to verify without treating it as a feed failure', async () => {
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([])),
      http.get('*/api/v1/marketplace/errands', () => apiError(403, 'VERIFICATION_REQUIRED', 'Identity verification is required.')),
    );

    renderWithClient(<MarketplaceFeedPage />);

    expect(await screen.findByRole('heading', { name: 'Your next errand starts here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue verification' })).toHaveAttribute('href', '/verification');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/Request ID:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply filters' })).not.toBeInTheDocument();
  });

  it.each([
    [429, 'RATE_LIMITED', 'You have made several feed requests. Please wait a moment before trying again.'],
    [500, 'INTERNAL_ERROR', 'We could not load the marketplace feed.'],
  ])('keeps genuine feed failures actionable (%s)', async (status, code, message) => {
    let failed = true;
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([])),
      http.get('*/api/v1/marketplace/errands', () => failed ? apiError(status, code, 'Request failed.') : envelope([])),
    );

    renderWithClient(<MarketplaceFeedPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByText('Request ID: req-msw')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continue verification' })).not.toBeInTheDocument();
    failed = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No errands match your filters right now.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('restores filters from a shared URL and only renders approximate feed areas', async () => {
    window.history.replaceState({}, '', '/marketplace?category=cat-1&q=pharmacy&budgetMin=5000');
    let receivedUrl: URL | undefined;
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([{ id: 'cat-1', key: 'health', name: 'Health' }])),
      http.get('*/api/v1/marketplace/errands', ({ request }) => {
        receivedUrl = new URL(request.url);
        return envelope([{
          id: 'errand-1', title: 'Collect medicine', category: { key: 'health', name: 'Health' },
          description: 'Pick up a sealed package.', pickup: { area: 'Yaba' }, destination: { area: 'Surulere' },
          distance: { label: '2–5 km', minKm: 2, maxKm: 5 }, timeMode: 'ASAP', priority: 'STANDARD',
          scheduledAt: null, suggestedBudgetMinor: 500000, requester: { firstName: 'Ada', photoMediaId: null, rating: null, ratingCount: 0, badges: [] },
          postedAt: '2026-01-01T10:00:00.000Z', expiresAt: '2026-01-02T10:00:00.000Z', offerCount: 1,
          boosted: false, saved: false,
        }]);
      }),
    );

    renderWithClient(<MarketplaceFeedPage />);

    expect(await screen.findByRole('link', { name: 'Collect medicine' })).toHaveAttribute('href', '/marketplace/errand-1');
    await waitFor(() => expect(receivedUrl?.searchParams.get('q')).toBe('pharmacy'));
    expect(receivedUrl?.searchParams.getAll('category')).toEqual(['cat-1']);
    expect(receivedUrl?.searchParams.get('budgetMin')).toBe('5000');
    expect(screen.queryByText(/address|street|unit/i)).not.toBeInTheDocument();
    expect(screen.getByText('Yaba')).toBeInTheDocument();
  });

  it('explains a verification blocker and does not expose an offer link on errand detail', async () => {
    server.use(
      http.get('*/api/v1/marketplace/errands/errand-blocked', () => envelope({
        id: 'errand-blocked', title: 'Pick up groceries',
        category: { id: 'cat-1', key: 'groceries', name: 'Groceries' },
        pickup: { area: 'Ikeja' }, destination: { area: 'Yaba' }, distance: null,
        timeMode: 'ASAP', priority: 'STANDARD', scheduledAt: null, suggestedBudgetMinor: null,
        requester: { firstName: 'Ada', photoMediaId: null, rating: null, ratingCount: 0, badges: [] },
        instructions: null, itemSize: null, itemValueMinor: null,
        pickupApprox: { area: 'Ikeja', lga: 'Ikeja', state: 'Lagos', approx: { lat: 6.6, lng: 3.35 } },
        destinationApprox: null, photos: [], postedAt: '2026-01-01T10:00:00.000Z',
        expiresAt: '2026-01-02T10:00:00.000Z', offerCount: 0, boosted: false, saved: false,
      })),
      http.get('*/api/v1/runner/eligibility', () => envelope({
        reasons: ['NOT_VERIFIED'], canOffer: false, canBrowseFeed: false,
      })),
    );

    renderWithClient(<MarketplaceErrandPage errandId="errand-blocked" />);

    expect(await screen.findByText('Complete runner verification before sending offers.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Complete verification' })).toHaveAttribute('href', '/verification');
    expect(screen.queryByRole('link', { name: 'Send an offer' })).not.toBeInTheDocument();
    expect(screen.queryByText(/street address|apartment/i)).not.toBeInTheDocument();
  });

  it('removes an unsaved errand and synchronizes the cached feed save state', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const savedItem = {
      id: 'saved-1', title: 'Deliver a parcel', category: { key: 'delivery', name: 'Delivery' },
      description: 'A parcel.', pickup: { area: 'Ikeja' }, destination: null, distance: null,
      timeMode: 'ASAP', priority: 'STANDARD', scheduledAt: null, suggestedBudgetMinor: 500000,
      requester: { firstName: 'Ada', photoMediaId: null, rating: null, ratingCount: 0, badges: [] },
      status: 'OPEN', savedAt: '2026-01-01T10:00:00.000Z', postedAt: '2026-01-01T10:00:00.000Z',
      expiresAt: '2026-01-02T10:00:00.000Z', offerCount: 0, boosted: false, saved: true,
    };
    const feedItem = { ...savedItem, saved: true } as FeedItem;
    let isSaved = true;
    const feedKey = queryKeys.marketplace.feed({ sort: 'recommended' });
    client.setQueryData<InfiniteData<ApiResponse<FeedItem[]>>>(feedKey, {
      pages: [{ data: [feedItem], meta: {}, requestId: 'req-feed' }],
      pageParams: [undefined],
    });
    server.use(
      http.get('*/api/v1/saved-errands', () => envelope(isSaved ? [savedItem] : [])),
      http.delete('*/api/v1/saved-errands/saved-1', () => {
        isSaved = false;
        return envelope({ saved: false });
      }),
    );

    renderWithClient(<SavedErrandsPage />, client);
    await user.click(await screen.findByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText('Deliver a parcel')).not.toBeInTheDocument());
    const cached = client.getQueryData<InfiniteData<ApiResponse<FeedItem[]>>>(feedKey);
    expect(cached?.pages[0].data[0].saved).toBe(false);
  });

  it('reports missing performance samples instead of displaying zero rates', async () => {
    server.use(
      http.get('*/api/v1/runner/assignments', () => envelope([])),
      http.get('*/api/v1/runner/assignments/summary', () => envelope({
        completed: 0, total: 0, months: [{ month: '2026-01', completed: 0, cancelled: 0, notAccepted: 0, agreedTotalMinor: 0 }],
      })),
      http.get('*/api/v1/runner/performance', () => envelope({
        completedErrands: 0, rating: { average: null, count: 0 },
        cancellation: { windowSize: 20, sample: 0, percent: null },
        response: { windowSize: 50, sample: 0, medianMinutes: null }, badges: [],
      })),
    );

    renderWithClient(<RunnerHistoryPage />);

    expect(await screen.findAllByText('No sample')).toHaveLength(3);
    expect(screen.getByText(/Last 20 accepted errands · sample 0/)).toBeInTheDocument();
    expect(screen.getByText(/Window 50 · sample 0/)).toBeInTheDocument();
  });
});
