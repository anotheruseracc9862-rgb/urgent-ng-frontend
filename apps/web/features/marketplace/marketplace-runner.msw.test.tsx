import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
import { MarketplaceMapPage } from './map/marketplace-map-page';
import { MarketplaceErrandPage } from './detail/marketplace-errand-page';
import { SavedErrandsPage } from './saved/saved-errands-page';
import { RunnerHistoryPage } from '@/features/runner/history/runner-history-page';
import type { FeedItem } from './api';

const replace = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock('@/components/map/MapProvider', () => ({
  MapProvider: ({ children }: { children: React.ReactNode }) => children,
  useMapProvider: () => ({ libraries: null, error: new Error('Map unavailable') }),
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
    expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continue verification' })).not.toBeInTheDocument();
    failed = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No errands match your filters right now.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps shared category failures retryable without hiding the search controls', async () => {
    let failed = true;
    server.use(
      http.get('*/api/v1/reference/categories', () => failed
        ? apiError(500, 'INTERNAL_ERROR', 'Request failed.')
        : envelope([{ id: 'cat-1', key: 'health', name: 'Health' }])),
      http.get('*/api/v1/marketplace/errands', () => envelope([])),
    );
    renderWithClient(<MarketplaceFeedPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load errand categories.');
    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
    failed = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('checkbox', { name: 'Health' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('restores filters from a shared URL and only renders approximate feed areas', async () => {
    window.history.replaceState({}, '', '/marketplace?category=health&q=pharmacy&budgetMin=5000');
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

    const feed = within(await screen.findByRole('region', { name: 'Marketplace errands' }));
    expect(feed.getByRole('heading', { name: 'Collect medicine' })).toBeInTheDocument();
    expect(feed.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/marketplace/errand-1');
    await waitFor(() => expect(receivedUrl?.searchParams.get('q')).toBe('pharmacy'));
    expect(receivedUrl?.searchParams.getAll('category')).toEqual(['health']);
    expect(screen.getByRole('checkbox', { name: 'Health' })).toBeChecked();
    expect(receivedUrl?.searchParams.get('budgetMin')).toBe('5000');
    expect(screen.queryByText(/address|street|unit/i)).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Marketplace errands' })).getByText('Yaba')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Map view' })).toHaveAttribute('href', '/marketplace?category=health&q=pharmacy&budgetMin=5000&view=map');
  });

  it('previews the selected errand with its own route, budget and offer link', async () => {
    const items = [
      { id: 'parcel', title: 'Deliver a parcel', pickup: { area: 'Ikeja' }, destination: { area: 'Yaba' }, suggestedBudgetMinor: 350000 },
      { id: 'medicine', title: 'Collect medicine', pickup: { area: 'Lekki' }, destination: { area: 'Ajah' }, suggestedBudgetMinor: 725000 },
    ].map((item) => ({
      ...item, category: { key: 'delivery', name: 'Delivery' }, description: 'A sealed package.',
      distance: null, timeMode: 'ASAP', priority: 'STANDARD', scheduledAt: null,
      requester: { firstName: 'Ada', photoMediaId: null, rating: null, ratingCount: 0, badges: [] },
      postedAt: '2026-01-01T10:00:00.000Z', expiresAt: '2026-01-02T10:00:00.000Z',
      offerCount: 1, boosted: false, saved: false,
    }));
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([])),
      http.get('*/api/v1/marketplace/errands', () => envelope(items)),
    );
    renderWithClient(<MarketplaceFeedPage />);
    const preview = within(await screen.findByRole('complementary', { name: 'Errand preview' }));
    expect(preview.getByRole('heading', { name: 'Deliver a parcel' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Preview Collect medicine' }));
    expect(preview.getByRole('heading', { name: 'Collect medicine' })).toBeInTheDocument();
    expect(preview.getByText('Lekki')).toBeInTheDocument();
    expect(preview.getByText('Ajah')).toBeInTheDocument();
    expect(preview.queryByText('Ikeja')).not.toBeInTheDocument();
    expect(preview.getByText(/7,250/)).toBeInTheDocument();
    expect(preview.getByRole('link', { name: 'Send offer' })).toHaveAttribute('href', '/marketplace/medicine/offer');
    expect(preview.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/marketplace/medicine');
    const card = within(screen.getByRole('region', { name: 'Marketplace errands' })).getAllByRole('article')[1];
    expect(within(card).getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/marketplace/medicine');
    expect(within(card).queryByText('Preview')).not.toBeInTheDocument();
  });

  it.each(['list', 'map'])('submits a %s search without sending the Any time display value to the API', async (view) => {
    window.history.replaceState({}, '', view === 'map' ? '/marketplace?view=map' : '/marketplace');
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([])),
      http.get('*/api/v1/marketplace/errands', () => envelope([])),
      http.get('*/api/v1/marketplace/errands/map', () => envelope([])),
    );
    renderWithClient(view === 'map' ? <MarketplaceMapPage /> : <MarketplaceFeedPage />);
    await screen.findByText(view === 'map' ? 'No errands match these filters.' : 'No errands match your filters right now.');
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'groceries');
    await user.click(screen.getByRole('button', { name: 'Search errands' }));
    expect(replace).toHaveBeenCalledWith(`/marketplace?${view === 'map' ? 'view=map&' : ''}q=groceries&sort=recommended`, { scroll: false });
  });

  it.each(['list', 'map'])('keeps draft filters when selecting or clearing %s categories', async (view) => {
    window.history.replaceState({}, '', `/marketplace?category=pickup&sort=newest${view === 'map' ? '&view=map' : ''}`);
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([
        { id: 'cat-1', key: 'delivery', name: 'Delivery' },
        { id: 'cat-2', key: 'pickup', name: 'Pickup' },
      ])),
      http.get('*/api/v1/marketplace/errands', () => envelope([])),
      http.get('*/api/v1/marketplace/errands/map', () => envelope([])),
    );
    renderWithClient(view === 'map' ? <MarketplaceMapPage /> : <MarketplaceFeedPage />);
    const user = userEvent.setup();
    await screen.findByRole('checkbox', { name: 'Delivery' });
    expect(screen.getByRole('checkbox', { name: 'Pickup' })).toBeChecked();
    await user.type(screen.getByRole('searchbox', { name: 'Search', exact: true }), 'parcel');
    await user.click(screen.getByText('More filters'));
    await user.type(screen.getByRole('spinbutton', { name: 'Radius (km)' }), '4');
    await user.type(screen.getByRole('spinbutton', { name: 'Min budget (kobo)' }), '280000');
    screen.getByRole('combobox', { name: 'Time mode' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('option', { name: 'Scheduled', exact: true });
    expect(screen.queryByRole('option', { name: 'Window', exact: true })).not.toBeInTheDocument();
    await user.keyboard('{End}{Enter}');
    await user.click(screen.getByRole('checkbox', { name: 'Delivery' }));
    expect(replace).toHaveBeenLastCalledWith(`/marketplace?${view === 'map' ? 'view=map&' : ''}category=pickup&category=delivery&timeMode=SCHEDULED&radiusKm=4&budgetMin=280000&q=parcel&sort=newest`, { scroll: false });
    await user.click(screen.getByRole('button', { name: 'All categories', exact: true }));
    expect(replace).toHaveBeenLastCalledWith(`/marketplace?${view === 'map' ? 'view=map&' : ''}timeMode=SCHEDULED&radiusKm=4&budgetMin=280000&q=parcel&sort=newest`, { scroll: false });
    await user.click(screen.getByRole('checkbox', { name: 'Pickup' }));
    expect(replace).toHaveBeenLastCalledWith(`/marketplace?${view === 'map' ? 'view=map&' : ''}timeMode=SCHEDULED&radiusKm=4&budgetMin=280000&q=parcel&sort=newest`, { scroll: false });
  });

  it('limits typed and pasted search text to the API maximum', async () => {
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([])),
      http.get('*/api/v1/marketplace/errands', () => envelope([])),
    );
    renderWithClient(<MarketplaceFeedPage />);
    await screen.findByText('No errands match your filters right now.');
    const user = userEvent.setup();
    const input = screen.getByRole('searchbox', { name: 'Search', exact: true });
    await user.type(input, 'x'.repeat(101));
    expect(input).toHaveValue('x'.repeat(100));
    await user.clear(input);
    await user.click(input);
    await user.paste('y'.repeat(101));
    expect(input).toHaveValue('y'.repeat(100));
  });

  it('shares map controls, preserves filters when returning to the list, and retains the SDK fallback', async () => {
    window.history.replaceState({}, '', '/marketplace?category=health&category=delivery&q=pharmacy&timeMode=ASAP&radiusKm=7&budgetMin=5000&sort=newest&view=map');
    let receivedUrl: URL | undefined;
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([{ id: 'cat-1', key: 'health', name: 'Health' }])),
      http.get('*/api/v1/marketplace/errands/map', ({ request }) => {
        receivedUrl = new URL(request.url);
        return envelope([]);
      }),
    );
    renderWithClient(<MarketplaceMapPage />);
    await screen.findByText('No errands match these filters.');
    expect(screen.getByRole('heading', { name: 'Find errands near you' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('pharmacy');
    expect(screen.getByRole('checkbox', { name: 'Health' })).toBeChecked();
    expect(screen.getByRole('link', { name: 'Map view' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('combobox', { name: 'Sort', exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'List view' })).toHaveAttribute('href', '/marketplace?category=health&category=delivery&q=pharmacy&timeMode=ASAP&radiusKm=7&budgetMin=5000&sort=newest');
    expect(receivedUrl?.searchParams.getAll('category')).toEqual(['health', 'delivery']);
    expect(receivedUrl?.searchParams.get('q')).toBe('pharmacy');
    expect(receivedUrl?.searchParams.get('timeMode')).toBe('ASAP');
    expect(receivedUrl?.searchParams.get('radiusKm')).toBe('7');
    expect(receivedUrl?.searchParams.get('budgetMin')).toBe('5000');
    expect(receivedUrl?.searchParams.get('limit')).toBe('200');
    expect(receivedUrl?.searchParams.has('sort')).toBe(false);
    expect(screen.getByText(/The map could not load/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(replace).toHaveBeenCalledWith('/marketplace?view=map&sort=newest', { scroll: false });
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

  it('shows the full public errand details and keeps offer and save actions usable', async () => {
    let saved = false;
    server.use(
      http.get('*/api/v1/marketplace/errands/errand-detail', () => envelope({
        id: 'errand-detail', title: 'Deliver a framed print', description: 'Keep the frame upright.',
        category: { key: 'delivery', name: 'Delivery' },
        pickup: { area: 'Ikeja', lga: 'Ikeja', state: 'Lagos' },
        destination: { area: 'Yaba', lga: 'Lagos Mainland', state: 'Lagos' },
        pickupApprox: null, destinationApprox: null, distance: { upperKm: 5, label: '< 5 km' },
        timeMode: 'SCHEDULED', priority: 'URGENT', scheduledAt: '2026-11-02T14:30:00.000Z',
        suggestedBudgetMinor: 725000, itemValueMinor: 1895000, itemSize: 'EXTRA_LARGE',
        instructions: 'Call on arrival. Do not leave with security.',
        requester: { firstName: 'Tola', photoMediaId: 'requester-photo', rating: 4.8, ratingCount: 17, badges: ['RELIABLE_REQUESTER'] },
        photos: [{ mediaId: 'frame-photo' }], postedAt: '2026-11-01T10:00:00.000Z',
        expiresAt: '2026-11-02T10:00:00.000Z', offerCount: 3, boosted: true, saved,
      })),
      http.get('*/api/v1/runner/eligibility', () => envelope({ reasons: [], canOffer: true, canBrowseFeed: true })),
      http.get('*/api/v1/media/:id/url', ({ params }) => envelope({ url: `https://example.test/${params.id}.jpg` })),
      http.post('*/api/v1/saved-errands/errand-detail', () => { saved = true; return envelope({ saved }); }),
      http.delete('*/api/v1/saved-errands/errand-detail', () => { saved = false; return envelope({ saved }); }),
    );

    renderWithClient(<MarketplaceErrandPage errandId="errand-detail" />);

    expect(await screen.findByRole('heading', { name: 'Deliver a framed print' })).toBeInTheDocument();
    const details = within(screen.getByRole('region', { name: 'Details', exact: true }));
    expect(details.getByText('Keep the frame upright.')).toBeInTheDocument();
    expect(details.getByText('Ikeja, Lagos')).toBeInTheDocument();
    expect(details.getByText('Yaba, Lagos Mainland, Lagos')).toBeInTheDocument();
    expect(details.getByText(/7,250/)).toBeInTheDocument();
    expect(details.getByText(/18,950/)).toBeInTheDocument();
    expect(details.getByText('extra large')).toBeInTheDocument();
    expect(details.getByText('< 5 km')).toBeInTheDocument();
    expect(details.getByText('Call on arrival. Do not leave with security.')).toBeInTheDocument();
    expect(details.getByText(/Exact pickup and destination details are kept private/)).toBeInTheDocument();
    expect(screen.getByText('Boosted')).toBeInTheDocument();
    expect(screen.getByText('4.8 / 5 · 17 ratings')).toBeInTheDocument();
    expect(screen.getByText('reliable requester')).toBeInTheDocument();
    expect(screen.getByText('Errand reference: errand-detail')).toBeInTheDocument();
    expect(document.querySelector('time[datetime="2026-11-02T14:30:00.000Z"]')).toHaveTextContent('2 Nov 2026');
    expect(document.querySelector('time[datetime="2026-11-02T10:00:00.000Z"]')).toHaveTextContent('2 Nov 2026');
    expect(screen.getByRole('link', { name: 'Send an offer' })).toHaveAttribute('href', '/marketplace/errand-detail/offer');
    expect(await screen.findByRole('img', { name: 'Errand item' })).toHaveAttribute('src', 'https://example.test/frame-photo.jpg');
    await waitFor(() => expect(document.querySelector('img[src="https://example.test/requester-photo.jpg"]')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Save errand' }));
    expect(await screen.findByRole('button', { name: 'Remove from saved errands' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Remove from saved errands' }));
    expect(await screen.findByRole('button', { name: 'Save errand' })).toHaveAttribute('aria-pressed', 'false');
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
