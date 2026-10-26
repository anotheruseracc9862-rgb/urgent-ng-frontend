import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { MarketplaceFeedPage } from './feed/marketplace-feed-page';
import { MarketplaceErrandPage } from './detail/marketplace-errand-page';
import { SubmitOfferPage } from '@/features/offers/submit/submit-offer-page';
import { SavedErrandsPage } from './saved/saved-errands-page';
import { MyOfferBadge, MyOfferCard, myOfferStatus } from '@/features/offers/my-offer';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock('@/components/map/MapProvider', () => ({ useMapProvider: () => ({ libraries: null, error: new Error('Map unavailable') }) }));

const envelope = (data: unknown, meta: Record<string, unknown> = {}) => HttpResponse.json({ data, meta, requestId: 'req-my-offer' });

const waiting = { id: 'offer-1', status: 'ACTIVE' as const, amountMinor: 600000, durationMinutes: 1440, awaitingParty: 'REQUESTER' as const, needsReconfirmation: false };
const counter = { ...waiting, amountMinor: 450000, awaitingParty: 'RUNNER' as const };
const reconfirm = { ...waiting, needsReconfirmation: true };
const declined = { ...waiting, status: 'REJECTED' as const, awaitingParty: 'NONE' as const };
const withdrawn = { ...waiting, status: 'WITHDRAWN' as const, awaitingParty: 'NONE' as const };

const errandBase = {
  category: { key: 'plumbing', name: 'Plumbing', flow: 'SERVICE' }, description: 'My sink is not working anymore',
  pickup: null, destination: { area: 'Ikeja' }, distance: null, timeMode: 'ASAP', priority: 'STANDARD', scheduledAt: null,
  suggestedBudgetMinor: 500000, requester: { firstName: 'Chiamaka', photoMediaId: null, rating: 4.3, ratingCount: 9, badges: [] },
  postedAt: '2026-10-21T22:08:00.000Z', expiresAt: '2026-10-22T22:08:00.000Z', offerCount: 2, boosted: false, saved: false,
};

function renderPage(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><SessionProvider me={{ id: 'runner-1', firstName: 'Ada', startMode: 'RUNNER' } as unknown as Me}>{ui}</SessionProvider></QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); window.history.replaceState({}, '', '/'); });
afterAll(() => server.close());

describe('myOfferStatus', () => {
  it('says what the runner has to do, if anything', () => {
    expect(myOfferStatus(waiting)).toMatchObject({ label: 'Offer sent', needsYou: false, ended: false });
    expect(myOfferStatus(counter)).toMatchObject({ label: 'Counter received', needsYou: true });
    expect(myOfferStatus(reconfirm)).toMatchObject({ label: 'Reconfirm your offer', needsYou: true });
    // An ended offer is the last word: one offer per errand.
    expect(myOfferStatus(declined)).toMatchObject({ label: 'Offer declined', ended: true, declined: true, needsYou: false });
    expect(myOfferStatus(withdrawn)).toMatchObject({ label: 'Offer withdrawn', ended: true, declined: false });
    expect(myOfferStatus({ ...waiting, status: 'CLOSED' as const }).label).toBe('Offer closed');
    expect(myOfferStatus({ ...waiting, status: 'SELECTED' as const })).toMatchObject({ label: 'You were chosen', needsYou: true });
    // A reconfirmation is the more pressing of the two.
    expect(myOfferStatus({ ...counter, needsReconfirmation: true }).label).toBe('Reconfirm your offer');
  });
});

describe('MyOfferBadge', () => {
  it('shows the price beside the state', () => {
    render(<MyOfferBadge offer={waiting} />);
    expect(screen.getByText(/Offer sent/)).toHaveTextContent('Offer sent · ₦6,000');
    cleanup();
    render(<MyOfferBadge offer={counter} />);
    expect(screen.getByText(/Counter received/)).toHaveTextContent('Counter received · ₦4,500');
  });
});

describe('an ended offer', () => {
  it('is marked as ended, in red for a decline and quietly for a withdrawal', () => {
    render(<MyOfferBadge offer={declined} />);
    expect(screen.getByText(/Offer declined/)).toHaveTextContent('Offer declined · ₦6,000');
    expect(screen.getByText(/Offer declined/).className).toMatch(/bg-red-bg/);
    cleanup();
    render(<MyOfferBadge offer={withdrawn} />);
    expect(screen.getByText(/Offer withdrawn/).className).toMatch(/bg-panel/);
  });

  it('says why another cannot be sent', () => {
    render(<MyOfferCard offer={declined} />);
    expect(screen.getByText(/The requester declined this offer\. Only one offer is allowed on an errand/)).toBeInTheDocument();
    cleanup();
    render(<MyOfferCard offer={withdrawn} />);
    expect(screen.getByText(/You withdrew this offer\. Only one offer is allowed on an errand/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open your offer' })).toHaveAttribute('href', '/offers/offer-1');
  });
});

describe('MyOfferCard', () => {
  it('shows the terms and whose move it is, and opens the offer', () => {
    render(<MyOfferCard offer={waiting} />);
    const card = within(screen.getByRole('region', { name: 'Your offer' }));
    expect(card.getByText('₦6,000', { selector: 'dd' })).toBeInTheDocument();
    expect(card.getByText(/1 day · done by/)).toBeInTheDocument();
    expect(card.getByText('Waiting for the requester.')).toBeInTheDocument();
    expect(card.getByRole('link', { name: 'Open your offer' })).toHaveAttribute('href', '/offers/offer-1');
  });

  it('asks for the runner\'s move when a counter has come in', () => {
    render(<MyOfferCard offer={counter} />);
    expect(screen.getByText('The requester sent a counter. Your move.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Counter received' })).toHaveAttribute('href', '/offers/offer-1');
  });
});

describe('the feed', () => {
  const feed = (items: unknown[]) => server.use(
    http.get('*/api/v1/reference/categories', () => envelope([])),
    http.get('*/api/v1/marketplace/errands', () => envelope(items)),
  );

  it('marks an errand the runner has offered on, and swaps Send offer for View your offer; others are untouched', async () => {
    feed([
      { ...errandBase, id: 'sink', title: 'Fix my sink', myOffer: waiting },
      { ...errandBase, id: 'wire', title: 'Rewire a socket', myOffer: null },
    ]);
    renderPage(<MarketplaceFeedPage />);

    const cards = within(await screen.findByRole('region', { name: 'Marketplace errands' })).getAllByRole('article');
    expect(within(cards[0]).getByText(/Offer sent/)).toHaveTextContent('Offer sent · ₦6,000');
    expect(within(cards[0]).getByRole('link', { name: 'View your offer' })).toHaveAttribute('href', '/offers/offer-1');
    expect(within(cards[0]).queryByRole('link', { name: 'Send offer' })).not.toBeInTheDocument();

    expect(within(cards[1]).queryByText(/Offer sent/)).not.toBeInTheDocument();
    expect(within(cards[1]).getByRole('link', { name: 'Send offer' })).toHaveAttribute('href', '/marketplace/wire/offer');
  });

  it('shows "Counter received" on the card when the requester has answered', async () => {
    feed([{ ...errandBase, id: 'sink', title: 'Fix my sink', myOffer: counter }]);
    renderPage(<MarketplaceFeedPage />);
    const card = (await screen.findAllByRole('article'))[0];
    expect(within(card).getByText(/Counter received/)).toHaveTextContent('Counter received · ₦4,500');
  });

  it('marks the quick look too', async () => {
    feed([{ ...errandBase, id: 'sink', title: 'Fix my sink', myOffer: waiting }]);
    renderPage(<MarketplaceFeedPage />);
    const preview = within(await screen.findByRole('complementary', { name: 'Errand preview' }));
    expect(preview.getByText(/Offer sent/)).toBeInTheDocument();
    expect(preview.getByRole('link', { name: 'View your offer' })).toHaveAttribute('href', '/offers/offer-1');
    expect(preview.queryByRole('link', { name: 'Send offer' })).not.toBeInTheDocument();
  });
});

describe('the errand page', () => {
  const errand = (myOffer: unknown) => server.use(
    http.get('*/api/v1/marketplace/errands/sink', () => envelope({
      ...errandBase, id: 'sink', title: 'Fix my sink', instructions: null, itemSize: null, itemValueMinor: null,
      pickupApprox: null, destinationApprox: null, photos: [], myOffer,
    })),
    http.get('*/api/v1/runner/eligibility', () => envelope({ reasons: [], canOffer: true, canBrowseFeed: true })),
  );

  it('shows the runner their own offer, and offers a way into it instead of a second one', async () => {
    errand(waiting);
    renderPage(<MarketplaceErrandPage errandId="sink" />);

    expect(await screen.findByRole('heading', { name: 'Fix my sink' })).toBeInTheDocument();
    const card = within(await screen.findByRole('region', { name: 'Your offer' }));
    expect(card.getByText('₦6,000', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View your offer' })[0]).toHaveAttribute('href', '/offers/offer-1');
    expect(screen.queryByRole('link', { name: 'Send an offer' })).not.toBeInTheDocument();
  });

  it('still offers Send an offer when the runner has none', async () => {
    errand(null);
    renderPage(<MarketplaceErrandPage errandId="sink" />);

    expect(await screen.findByRole('link', { name: 'Send an offer' })).toHaveAttribute('href', '/marketplace/sink/offer');
    expect(screen.queryByRole('region', { name: 'Your offer' })).not.toBeInTheDocument();
  });
});

describe('an errand the runner was declined on', () => {
  it('shows on the feed as declined, with no Send offer', async () => {
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([])),
      http.get('*/api/v1/marketplace/errands', () => envelope([{ ...errandBase, id: 'sink', title: 'Fix my sink', myOffer: declined }])),
    );
    renderPage(<MarketplaceFeedPage />);
    const card = (await screen.findAllByRole('article'))[0];
    expect(within(card).getByText(/Offer declined/)).toBeInTheDocument();
    expect(within(card).queryByRole('link', { name: 'Send offer' })).not.toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'View your offer' })).toHaveAttribute('href', '/offers/offer-1');
  });

  it('shows on the errand page without an offer button', async () => {
    server.use(
      http.get('*/api/v1/marketplace/errands/sink', () => envelope({
        ...errandBase, id: 'sink', title: 'Fix my sink', instructions: null, itemSize: null, itemValueMinor: null,
        pickupApprox: null, destinationApprox: null, photos: [], myOffer: declined,
      })),
      http.get('*/api/v1/runner/eligibility', () => envelope({ reasons: [], canOffer: true, canBrowseFeed: true })),
    );
    renderPage(<MarketplaceErrandPage errandId="sink" />);
    expect(await screen.findByRole('region', { name: 'Your offer' })).toHaveTextContent('The requester declined this offer');
    expect(screen.queryByRole('link', { name: 'Send an offer' })).not.toBeInTheDocument();
  });
});

describe('the send-offer page when the runner already has an offer', () => {
  const open = (myOffer: unknown) => server.use(
    http.get('*/api/v1/marketplace/errands/sink', () => envelope({
      ...errandBase, id: 'sink', title: 'Fix my sink', instructions: null, itemSize: null, itemValueMinor: null,
      pickupApprox: null, destinationApprox: null, photos: [], myOffer,
    })),
    http.get('*/api/v1/reference/categories', () => envelope([])),
    http.get('*/api/v1/runner/offer-limit', () => envelope({ used: 2, limit: 10, remaining: 8, resetsAt: '2026-10-22T00:00:00.000Z', isPro: false, isAtLimit: false })),
    http.get('*/api/v1/runner/eligibility', () => envelope({ canOffer: true, canBrowseFeed: true, reasons: [] })),
  );

  it('shows the live offer instead of a form that would be refused', async () => {
    open(waiting);
    renderPage(<SubmitOfferPage errandId="sink" />);
    expect(await screen.findByText(/You already have an offer on this errand\. Open it to edit it or answer a counter\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send offer' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open your offer' })).toHaveAttribute('href', '/offers/offer-1');
  });

  it('says an ended offer is the only one allowed', async () => {
    open(declined);
    renderPage(<SubmitOfferPage errandId="sink" />);
    expect(await screen.findByText(/it has ended\. Only one offer is allowed on an errand/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send offer' })).not.toBeInTheDocument();
  });

  it('still shows the form when there is no offer', async () => {
    open(null);
    renderPage(<SubmitOfferPage errandId="sink" />);
    expect(await screen.findByRole('button', { name: 'Send offer' })).toBeInTheDocument();
  });
});

describe('the saved list', () => {
  it('marks a saved errand the runner has offered on', async () => {
    server.use(http.get('*/api/v1/saved-errands', () => envelope([
      { ...errandBase, id: 'sink', title: 'Fix my sink', status: 'OPEN', savedAt: '2026-10-21T10:00:00.000Z', saved: true, myOffer: waiting },
    ])));
    renderPage(<SavedErrandsPage />);

    const card = await screen.findByRole('article');
    expect(within(card).getByText(/Offer sent/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'View your offer' })).toHaveAttribute('href', '/offers/offer-1');
    expect(within(card).queryByRole('link', { name: 'Send offer' })).not.toBeInTheDocument();
  });
});
