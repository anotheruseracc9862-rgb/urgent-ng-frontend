import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { components } from '@urgent/api-client';
import { listen, server } from '@/test/msw/server';
import { markErrandJustPosted, wasErrandJustPosted } from './errand-posted-banner';
import { ErrandDetailPage } from './errand-detail-page';

type Errand = components['schemas']['ErrandDto'];
type Offer = components['schemas']['OfferListItemDto'];

const errandId = 'errand-detail-1';
const errand: Errand = {
  id: errandId,
  version: 3,
  status: 'OPEN',
  category: { id: 'category-1', key: 'delivery', name: 'Delivery' },
  title: 'Deliver a package',
  description: 'Collect and deliver one package.',
  instructions: 'Keep the parcel upright.',
  priority: 'STANDARD',
  timeMode: 'ASAP',
  scheduledAt: null,
  suggestedBudgetMinor: 500000,
  itemSize: 'SMALL',
  itemValueMinor: null,
  pickup: {
    area: 'Ikeja',
    lga: 'Ikeja',
    state: 'Lagos',
    approx: { lat: 6.6, lng: 3.35 },
    exact: { lat: 6.6, lng: 3.35 },
    addressText: '12 Private Street',
    landmark: 'Blue gate',
  },
  destination: null,
  pickupContact: { name: 'Ada', phone: '+2348012345678' },
  dropoffContact: null,
  photos: [],
  assignment: null,
  offerCount: 2,
  publishedAt: '2026-10-14T10:00:00.000Z',
  expiresAt: '2026-10-15T10:00:00.000Z',
  autoCompleteAt: null,
  extended: false,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-10-14T09:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
};

const offers: Offer[] = [
  {
    id: 'offer-reconfirm',
    runnerId: 'runner-1',
    runnerName: 'Tunde Okon',
    runnerPhotoMediaId: null,
    runnerVerified: true,
    runnerRating: 4.8,
    runnerCompletedErrands: 22,
    runnerBadges: ['RELIABLE'],
    runnerIsPro: false,
    amountMinor: 400000,
    durationMinutes: 20,
    message: 'I can help with this.',
    distanceBucket: '< 2 km',
    awaitingParty: 'REQUESTER',
    needsReconfirmation: true,
    version: 1,
    createdAt: '2026-10-14T10:05:00.000Z',
  },
  {
    id: 'offer-selectable',
    runnerId: 'runner-2',
    runnerName: 'Chidi Eze',
    runnerPhotoMediaId: null,
    runnerVerified: false,
    runnerRating: null,
    runnerCompletedErrands: 2,
    runnerBadges: [],
    runnerIsPro: false,
    amountMinor: 450000,
    durationMinutes: 30,
    distanceBucket: null,
    awaitingParty: 'REQUESTER',
    needsReconfirmation: false,
    version: 4,
    createdAt: '2026-10-14T10:06:00.000Z',
  },
];

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-detail' });

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ErrandDetailPage errandId={errandId} />
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe('requester errand detail', () => {
  it('shows owner-only locations and contacts, and keeps reconfirming offers unselectable', async () => {
    const user = userEvent.setup();
    const queriedSorts: string[] = [];
    let selectedOffer: unknown;
    let idempotencyKey: string | null = null;
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope(errand)),
      http.get(`*/api/v1/errands/${errandId}/offers`, ({ request }) => {
        const sort = new URL(request.url).searchParams.get('sort') ?? '';
        queriedSorts.push(sort);
        return envelope(sort === 'eta_asc' ? [...offers].reverse() : offers);
      }),
      http.post(`*/api/v1/errands/${errandId}/select-runner`, async ({ request }) => {
        selectedOffer = await request.json();
        idempotencyKey = request.headers.get('Idempotency-Key');
        return envelope({
          id: 'assignment-selected',
          errandId,
          offerId: 'offer-selectable',
          requesterId: 'requester-1',
          runnerId: 'runner-2',
          status: 'PENDING_ACCEPTANCE',
          agreedAmountMinor: 450000,
          currency: 'NGN',
          selectedAt: '2026-10-14T11:00:00.000Z',
          acceptanceDeadline: '2026-10-14T11:30:00.000Z',
          acceptedAt: null,
          declinedAt: null,
          timedOutAt: null,
          cancelledAt: null,
          completedAt: null,
          version: 1,
        });
      }),
    );

    renderDetail();

    expect(await screen.findByText('12 Private Street')).toBeInTheDocument();
    expect(screen.getByText(/Ada · \+2348012345678/)).toBeInTheDocument();
    expect(await screen.findByText('Tunde Okon')).toBeInTheDocument();
    expect(screen.getByText(/Waiting for the runner to reconfirm/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Select · ₦4,000/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select · ₦4,500/ })).toBeInTheDocument();
    // Each offer links to its negotiation, so the requester can counter from the errand.
    const links = screen.getAllByRole('link', { name: 'Negotiate' });
    expect(links.map((link) => link.getAttribute('href'))).toContain('/offers/offer-selectable');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort offers' }), 'eta_asc');
    await waitFor(() => expect(queriedSorts).toContain('eta_asc'));
    await waitFor(() => expect(screen.getAllByRole('article')[0]).toHaveTextContent('Chidi Eze'));
    await user.click(screen.getByRole('button', { name: /Select · ₦4,500/ }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('The runner will have a limited acceptance window');
    expect(screen.getByRole('dialog')).toHaveTextContent('₦4,500');
    expect(selectedOffer).toBeUndefined();
    await user.click(screen.getByRole('button', { name: /Confirm selection · ₦4,500/ }));
    await waitFor(() => expect(selectedOffer).toEqual({ offerId: 'offer-selectable', expectedOfferVersion: 4 }));
    expect(idempotencyKey).toBeTruthy();
  });

  it('cancels an open errand from a dialog on the page itself, with no cancel page and no reason to give', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope({ ...errand, offerCount: 2 })),
      http.get(`*/api/v1/errands/${errandId}/offers`, () => envelope([])),
      http.get('*/api/v1/me/consents', () => envelope({ consents: [] })),
      http.post(`*/api/v1/errands/${errandId}/cancel`, async ({ request }) => {
        body = await request.json();
        return envelope({ ...errand, status: 'CANCELLED' });
      }),
    );
    renderDetail();

    const cancel = await screen.findByRole('button', { name: 'Cancel' });
    expect(screen.queryByRole('link', { name: 'Cancel' })).not.toBeInTheDocument();
    await user.click(cancel);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('2 offers on it will close');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel errand' }));

    await waitFor(() => expect(body).toEqual({}));
  });

  it('confirms a fresh post on the errand page itself, once', async () => {
    markErrandJustPosted(errandId);
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope(errand)),
      http.get(`*/api/v1/errands/${errandId}/offers`, () => envelope([])),
      http.get('*/api/v1/me/consents', () => envelope({ consents: [] })),
    );
    renderDetail();
    expect(await screen.findByRole('status', { name: 'Errand posted' })).toHaveTextContent('Nearby runners were notified');
    expect(await screen.findByText('No offers yet')).toBeInTheDocument();
    expect(wasErrandJustPosted(errandId)).toBe(false);
  });

  it('does not render exact addresses when the owner endpoint denies access', async () => {
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () =>
        HttpResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Not found' }, requestId: 'req-private' }, { status: 404 }),
      ),
    );

    renderDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent('This errand could not be found, or you do not have permission to view it.');
    expect(screen.queryByText('12 Private Street')).not.toBeInTheDocument();
    expect(screen.queryByText('+2348012345678')).not.toBeInTheDocument();
  });

  it('handles a concurrent runner selection by refreshing and showing the winning state calmly', async () => {
    const user = userEvent.setup();
    let errandReads = 0;
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => {
        errandReads += 1;
        return envelope(errandReads === 1 ? errand : { ...errand, status: 'RUNNER_SELECTED' });
      }),
      http.get(`*/api/v1/errands/${errandId}/offers`, () => envelope(offers)),
      http.post(`*/api/v1/errands/${errandId}/select-runner`, () =>
        HttpResponse.json({
          error: { code: 'ASSIGNMENT_CONFLICT', message: 'Another action was completed first.' },
          requestId: 'req-selection-conflict',
        }, { status: 409 }),
      ),
    );

    renderDetail();
    await user.click(await screen.findByRole('button', { name: /Select · ₦4,500/ }));
    await user.click(await screen.findByRole('button', { name: /Confirm selection · ₦4,500/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('Another selection was completed first.');
    await waitFor(() => expect(errandReads).toBeGreaterThan(1));
    expect(screen.getAllByText('Runner selected').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Confirm selection/ })).not.toBeInTheDocument();
  });

  it('loads the selected runner profile and assignment timeline from the owner response', async () => {
    const assignmentId = 'assignment-detail-1';
    const selectedErrand: Errand = {
      ...errand,
      status: 'RUNNER_SELECTED',
      assignment: {
        id: assignmentId,
        runnerId: 'runner-1',
        status: 'PENDING_ACCEPTANCE',
        agreedAmountMinor: 420000,
        acceptedAt: null,
      },
    };
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope(selectedErrand)),
      http.get('*/api/v1/users/runner-1', () => envelope({
        id: 'runner-1',
        firstName: 'Tunde',
        lastInitial: 'O',
        photoMediaId: null,
        bio: null,
        memberSince: '2025-01-01T00:00:00.000Z',
        badges: ['RELIABLE'],
        stats: {
          runnerRating: { average: 4.8, count: 8 },
          requesterRating: { average: null, count: 0 },
          completedAsRunner: 22,
          completedAsRequester: 1,
        },
      })),
      http.get(`*/api/v1/assignments/${assignmentId}/timeline`, () => envelope([{
        id: 'event-1',
        type: 'STARTED',
        actorType: 'SYSTEM',
        actorId: null,
        note: null,
        mediaId: null,
        metadata: null,
        createdAt: '2026-10-14T10:10:00.000Z',
      }])),
    );

    renderDetail();

    expect(await screen.findByText('Tunde O.')).toBeInTheDocument();
    expect(await screen.findByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Agreed runner fee')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Assignment hub/ })).toHaveAttribute('href', `/assignments/${assignmentId}`);
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', `/errands/${errandId}/cancel`);
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Extend deadline' })).not.toBeInTheDocument();
  });

  it('updates the displayed deadline after the one allowed extension', async () => {
    const user = userEvent.setup();
    let extensionCount = 0;
    // The server is the authority: once extended it answers with the extended errand, so the
    // refresh that follows a write agrees with the write's own response.
    const extended = { ...errand, version: 4, extended: true, expiresAt: '2026-10-16T10:00:00.000Z' };
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope(extensionCount > 0 ? extended : errand)),
      http.get(`*/api/v1/errands/${errandId}/offers`, () => envelope([])),
      http.post(`*/api/v1/errands/${errandId}/extend`, () => {
        extensionCount += 1;
        return envelope(extended);
      }),
    );

    renderDetail();
    await user.click(await screen.findByRole('button', { name: 'Extend deadline' }));

    await waitFor(() => expect(extensionCount).toBe(1));
    expect(await screen.findByRole('button', { name: 'Already extended' })).toBeDisabled();
    expect(screen.getByText(/Current deadline: 16 Oct 2026/)).toBeInTheDocument();
  });

  it('reposts an expired errand as a new draft', async () => {
    const user = userEvent.setup();
    let duplicateCount = 0;
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope({ ...errand, status: 'EXPIRED' })),
      http.post(`*/api/v1/errands/${errandId}/duplicate`, () => {
        duplicateCount += 1;
        return envelope({
          ...errand,
          id: 'errand-repost-draft',
          status: 'DRAFT',
          assignment: null,
          offerCount: 0,
        });
      }),
    );

    renderDetail();
    await user.click(await screen.findByRole('button', { name: 'Repost as draft' }));

    await waitFor(() => expect(duplicateCount).toBe(1));
    expect(screen.getByText('This errand expired before a runner was selected. You can repost it as a new draft.')).toBeInTheDocument();
  });

  it('says what a running boost brings and that it is not refunded, under the status', async () => {
    server.use(http.get(`*/api/v1/errands/${errandId}`, () => envelope({
      ...errand,
      boost: { expiresAt: new Date(Date.now() + 3_600_000).toISOString(), startedAt: new Date().toISOString(), openedByCount: 4, offersSinceCount: 1 },
    })));

    renderDetail();

    expect(await screen.findByText(/opened by 4 runners · 1 offer/)).toBeInTheDocument();
    expect(screen.getByText("This boost ends if you cancel or a runner accepts, and it isn't refunded.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Already boosted until/ })).toBeDisabled();
  });

  it('says nothing about a boost when there is none', async () => {
    server.use(http.get(`*/api/v1/errands/${errandId}`, () => envelope({ ...errand, boost: null })));

    renderDetail();

    expect(await screen.findByRole('link', { name: 'Boost' })).toBeInTheDocument();
    expect(screen.queryByText(/isn't refunded/)).toBeNull();
  });

  it('shows only draft management actions before publishing', async () => {
    server.use(http.get(`*/api/v1/errands/${errandId}`, () => envelope({
      ...errand,
      status: 'DRAFT',
      publishedAt: null,
      expiresAt: null,
      offerCount: 0,
    })));

    renderDetail();

    expect(await screen.findByRole('link', { name: 'Edit draft' })).toHaveAttribute('href', `/errands/${errandId}/edit`);
    expect(screen.getByRole('link', { name: 'Review and publish' })).toHaveAttribute('href', `/errands/${errandId}/review`);
    expect(screen.getByRole('button', { name: 'Delete draft' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Boost' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Extend deadline' })).not.toBeInTheDocument();
  });
});
