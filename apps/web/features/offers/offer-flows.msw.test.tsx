import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { AssignmentPendingPage } from './assignment/assignment-pending-page';
import { MyOffersPage } from './list/my-offers-page';
import { OfferNegotiationPage } from './negotiation/offer-negotiation-page';
import { SubmitOfferPage } from './submit/submit-offer-page';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));
vi.mock('@/lib/auth/client', () => ({ useSession: () => ({ me: { id: 'runner-1' } }) }));

const envelope = (data: unknown, meta: Record<string, unknown> = {}) =>
  HttpResponse.json({ data, meta, requestId: 'req-offers' });

function renderWithQuery(ui: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('Phase 4 offer and assignment flows', () => {
  it('submits an available runner offer with an idempotency key and routes to its negotiation', async () => {
    const user = userEvent.setup();
    let requestKey: string | null = null;
    const errandId = 'marketplace-errand-1';
    server.use(
      http.get(`*/api/v1/marketplace/errands/${errandId}`, () => envelope({
        id: errandId,
        title: 'Pick up a cake',
        category: { id: 'delivery', key: 'delivery', name: 'Delivery' },
        pickup: { area: 'Ikeja' },
        destination: { area: 'Magodo' },
        distance: null,
        suggestedBudgetMinor: 500000,
      })),
      http.get('*/api/v1/runner/offer-limit', () => envelope({
        used: 2, limit: 10, remaining: 8, resetsAt: '2026-10-15T00:00:00.000Z', isPro: false, isAtLimit: false,
      })),
      http.get('*/api/v1/runner/eligibility', () => envelope({ canOffer: true, canBrowseFeed: true, reasons: [] })),
      http.post(`*/api/v1/errands/${errandId}/offers`, async ({ request }) => {
        requestKey = request.headers.get('Idempotency-Key');
        expect(await request.json()).toEqual({
          amountMinor: 550000,
          durationMinutes: 30,
          availabilityConfirmed: true,
          message: 'I am nearby.',
        });
        return envelope({ id: 'offer-created-1' });
      }),
    );

    renderWithQuery(<SubmitOfferPage errandId={errandId} />);
    await user.type(await screen.findByLabelText(/Your price \(NGN\)/), '5500');
    await user.clear(screen.getByLabelText(/Estimated time \(minutes\)/));
    await user.type(screen.getByLabelText(/Estimated time \(minutes\)/), '30');
    await user.type(screen.getByLabelText(/Message/), 'I am nearby.');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Send offer' }));

    await waitFor(() => expect(requestKey).toBeTruthy());
    await user.click(await screen.findByRole('button', { name: 'Continue to offer' }));
    expect(navigation.push).toHaveBeenCalledWith('/offers/offer-created-1');
  });

  it('shows the daily reset and Runner Pro option instead of the offer form at the limit', async () => {
    const errandId = 'marketplace-errand-limit';
    server.use(
      http.get(`*/api/v1/marketplace/errands/${errandId}`, () => envelope({
        id: errandId, title: 'Pick up a cake', category: { id: 'delivery', key: 'delivery', name: 'Delivery' },
        pickup: null, destination: null, distance: null, suggestedBudgetMinor: null,
      })),
      http.get('*/api/v1/runner/offer-limit', () => envelope({
        used: 10, limit: 10, remaining: 0, resetsAt: '2026-10-15T00:00:00.000Z', isPro: false, isAtLimit: true,
      })),
      http.get('*/api/v1/runner/eligibility', () => envelope({ canOffer: true, canBrowseFeed: true, reasons: [] })),
    );

    renderWithQuery(<SubmitOfferPage errandId={errandId} />);

    expect(await screen.findByText('10 / 10')).toBeInTheDocument();
    expect(screen.getByText(/Resets .* \(Lagos time\)/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No daily offer cap' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send offer' })).not.toBeInTheDocument();
  });

  it('counters only on the runner turn and refreshes the server negotiation after success', async () => {
    const user = userEvent.setup();
    let currentOffer = {
      id: 'offer-negotiation-1',
      errandId: 'errand-1',
      runnerId: 'runner-1',
      requesterId: 'requester-1',
      amountMinor: 500000,
      durationMinutes: 30,
      status: 'ACTIVE',
      awaitingParty: 'RUNNER',
      version: 4,
      needsReconfirmation: false,
      closeReason: null,
      conversationId: null,
      assignmentId: null,
      createdAt: '2026-10-14T10:00:00.000Z',
      updatedAt: '2026-10-14T10:00:00.000Z',
      availabilityConfirmedAt: '2026-10-14T10:00:00.000Z',
      message: null,
      errandTitle: 'Pick up a cake',
      history: [{
        id: 'event-initial', type: 'INITIAL_OFFER', actorUserId: 'runner-1', amountMinor: 500000,
        durationMinutes: 30, message: 'Available now.', createdAt: '2026-10-14T10:00:00.000Z',
      }],
    };
    let counterBody: unknown;
    server.use(
      http.get('*/api/v1/offers/offer-negotiation-1', () => envelope(currentOffer)),
      http.post('*/api/v1/offers/offer-negotiation-1/counter', async ({ request }) => {
        counterBody = await request.json();
        currentOffer = {
          ...currentOffer,
          amountMinor: 550000,
          awaitingParty: 'REQUESTER',
          version: 5,
          history: [...currentOffer.history, {
            id: 'event-counter', type: 'COUNTER_OFFER', actorUserId: 'runner-1', amountMinor: 550000,
            durationMinutes: 30, message: 'Can complete today.', createdAt: '2026-10-14T10:05:00.000Z',
          }],
        };
        return envelope(currentOffer);
      }),
    );

    renderWithQuery(<OfferNegotiationPage offerId="offer-negotiation-1" />);
    expect(await screen.findByText('It is your turn to respond.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Counter' }));
    await user.clear(screen.getByLabelText('Amount (NGN)'));
    await user.type(screen.getByLabelText('Amount (NGN)'), '5500');
    await user.type(screen.getByLabelText('Message (optional)'), 'Can complete today.');
    await user.click(screen.getByRole('button', { name: 'Send counter' }));

    await waitFor(() => expect(counterBody).toEqual({
      amountMinor: 550000,
      durationMinutes: 30,
      message: 'Can complete today.',
      expectedVersion: 4,
    }));
    expect(await screen.findByText('Waiting for the requester to respond.')).toBeInTheDocument();
    expect(screen.getByText(/You countered ₦5,500/)).toBeInTheDocument();
  });

  it('refetches and renders current terms after an offer-version conflict', async () => {
    const user = userEvent.setup();
    let currentOffer = {
      id: 'offer-stale-1',
      errandId: 'errand-1',
      runnerId: 'runner-1',
      requesterId: 'requester-1',
      amountMinor: 500000,
      durationMinutes: 30,
      status: 'ACTIVE',
      awaitingParty: 'RUNNER',
      version: 4,
      needsReconfirmation: false,
      closeReason: null,
      conversationId: null,
      assignmentId: null,
      createdAt: '2026-10-14T10:00:00.000Z',
      updatedAt: '2026-10-14T10:00:00.000Z',
      availabilityConfirmedAt: '2026-10-14T10:00:00.000Z',
      message: null,
      errandTitle: 'Pick up a cake',
      history: [],
    };
    server.use(
      http.get('*/api/v1/offers/offer-stale-1', () => envelope(currentOffer)),
      http.post('*/api/v1/offers/offer-stale-1/counter', () => {
        currentOffer = { ...currentOffer, amountMinor: 600000, awaitingParty: 'REQUESTER', version: 5 };
        return HttpResponse.json({
          error: { code: 'OFFER_VERSION_MISMATCH', message: 'Offer changed.' },
          requestId: 'req-stale',
        }, { status: 409 });
      }),
    );

    renderWithQuery(<OfferNegotiationPage offerId="offer-stale-1" />);
    await user.click(await screen.findByRole('button', { name: 'Counter' }));
    await user.click(screen.getByRole('button', { name: 'Send counter' }));

    expect(await screen.findByText(/refreshed the latest terms and negotiation turn/)).toBeInTheDocument();
    expect(screen.getByText(/₦6,000/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount (NGN)')).not.toBeInTheDocument();
  });

  it('shows timeout and reopening after the server rejects a late acceptance', async () => {
    const user = userEvent.setup();
    let getCount = 0;
    const assignment = {
      id: 'assignment-pending-1',
      errandId: 'errand-1',
      offerId: 'offer-1',
      requesterId: 'requester-1',
      runnerId: 'runner-1',
      status: getCount === 0 ? 'PENDING_ACCEPTANCE' : 'TIMED_OUT',
      agreedAmountMinor: 550000,
      currency: 'NGN',
      selectedAt: '2026-10-14T10:00:00.000Z',
      acceptanceDeadline: '2026-10-14T10:30:00.000Z',
      acceptedAt: null,
      declinedAt: null,
      timedOutAt: null,
      cancelledAt: null,
      completedAt: null,
      version: 1,
      role: 'RUNNER',
      errand: { id: 'errand-1', status: getCount === 0 ? 'RUNNER_SELECTED' : 'OPEN', title: 'Pick up a cake' },
    };
    server.use(
      http.get('*/api/v1/assignments/assignment-pending-1', () => {
        getCount += 1;
        const refreshed = {
          ...assignment,
          status: getCount <= 1 ? 'PENDING_ACCEPTANCE' : 'TIMED_OUT',
          errand: { ...assignment.errand, status: getCount <= 1 ? 'RUNNER_SELECTED' : 'OPEN' },
        };
        return HttpResponse.json({ data: refreshed, meta: {}, requestId: 'req-assignment' }, {
          headers: { Date: 'Wed, 14 Oct 2026 10:10:00 GMT' },
        });
      }),
      http.post('*/api/v1/assignments/assignment-pending-1/accept', ({ request }) => {
        expect(request.headers.get('Idempotency-Key')).toBeTruthy();
        return HttpResponse.json({
          error: { code: 'ASSIGNMENT_ACCEPTANCE_EXPIRED', message: 'The acceptance window has expired.' },
          requestId: 'req-expired',
        }, { status: 409 });
      }),
    );

    renderWithQuery(<AssignmentPendingPage assignmentId="assignment-pending-1" />);
    await user.click(await screen.findByRole('button', { name: 'Accept assignment' }));

    expect(await screen.findByText('Acceptance window ended')).toBeInTheDocument();
    expect(screen.getByText(/errand has reopened and can receive new offers/)).toBeInTheDocument();
  });

  it('accepts an assignment within the server acceptance window', async () => {
    const user = userEvent.setup();
    let reads = 0;
    let acceptKey: string | null = null;
    server.use(
      http.get('*/api/v1/assignments/assignment-accept-1', () => {
        reads += 1;
        return HttpResponse.json({
          data: {
            id: 'assignment-accept-1',
            errandId: 'errand-1',
            offerId: 'offer-1',
            requesterId: 'requester-1',
            runnerId: 'runner-1',
            status: reads === 1 ? 'PENDING_ACCEPTANCE' : 'ACCEPTED',
            agreedAmountMinor: 550000,
            currency: 'NGN',
            selectedAt: '2026-10-14T10:00:00.000Z',
            acceptanceDeadline: '2026-10-14T10:30:00.000Z',
            acceptedAt: '2026-10-14T10:15:00.000Z',
            declinedAt: null,
            timedOutAt: null,
            cancelledAt: null,
            completedAt: null,
            version: reads === 1 ? 1 : 2,
            role: 'RUNNER',
            errand: { id: 'errand-1', status: reads === 1 ? 'RUNNER_SELECTED' : 'ACCEPTED', title: 'Pick up a cake' },
          },
          requestId: 'req-assignment-accept',
        }, { headers: { Date: 'Wed, 14 Oct 2026 10:10:00 GMT' } });
      }),
      http.post('*/api/v1/assignments/assignment-accept-1/accept', ({ request }) => {
        acceptKey = request.headers.get('Idempotency-Key');
        return envelope({ id: 'assignment-accept-1', status: 'ACCEPTED' });
      }),
    );

    renderWithQuery(<AssignmentPendingPage assignmentId="assignment-accept-1" />);
    await user.click(await screen.findByRole('button', { name: 'Accept assignment' }));

    expect(await screen.findByText('Assignment accepted')).toBeInTheDocument();
    expect(acceptKey).toBeTruthy();
  });

  it('requires confirmation before declining and shows the reopened errand', async () => {
    const user = userEvent.setup();
    let reads = 0;
    server.use(
      http.get('*/api/v1/assignments/assignment-decline-1', () => {
        reads += 1;
        return HttpResponse.json({
          data: {
            id: 'assignment-decline-1',
            errandId: 'errand-1',
            offerId: 'offer-1',
            requesterId: 'requester-1',
            runnerId: 'runner-1',
            status: reads === 1 ? 'PENDING_ACCEPTANCE' : 'DECLINED',
            agreedAmountMinor: 550000,
            currency: 'NGN',
            selectedAt: '2026-10-14T10:00:00.000Z',
            acceptanceDeadline: '2026-10-14T10:30:00.000Z',
            acceptedAt: null,
            declinedAt: null,
            timedOutAt: null,
            cancelledAt: null,
            completedAt: null,
            version: reads === 1 ? 1 : 2,
            role: 'RUNNER',
            errand: { id: 'errand-1', status: reads === 1 ? 'RUNNER_SELECTED' : 'OPEN', title: 'Pick up a cake' },
          },
          requestId: 'req-assignment-decline',
        }, { headers: { Date: 'Wed, 14 Oct 2026 10:10:00 GMT' } });
      }),
      http.post('*/api/v1/assignments/assignment-decline-1/decline', () => envelope({ id: 'assignment-decline-1' })),
    );

    renderWithQuery(<AssignmentPendingPage assignmentId="assignment-decline-1" />);
    await user.click(await screen.findByRole('button', { name: 'Decline' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Declining is final');
    expect(reads).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Confirm decline' }));

    expect(await screen.findByText('Assignment declined')).toBeInTheDocument();
    expect(screen.getByText(/errand has reopened for other runners/)).toBeInTheDocument();
  });

  it('loads runner offers with cursor pagination and grouped state labels', async () => {
    const user = userEvent.setup();
    const cursors: string[] = [];
    server.use(
      http.get('*/api/v1/runner/offers', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor') ?? '';
        cursors.push(cursor);
        return cursor
          ? envelope([{
            id: 'offer-closed', errandId: 'errand-closed', status: 'CLOSED', awaitingParty: 'NONE',
            amountMinor: 350000, durationMinutes: 45, needsReconfirmation: false, version: 2,
            closeReason: 'ERRAND_CANCELLED', errandTitle: 'Deliver documents', errandStatus: 'CANCELLED',
            pickupArea: 'Ikeja', destinationArea: null, createdAt: '2026-10-13T10:00:00.000Z',
          }])
          : envelope([{
            id: 'offer-active', errandId: 'errand-active', status: 'ACTIVE', awaitingParty: 'RUNNER',
            amountMinor: 500000, durationMinutes: 30, needsReconfirmation: false, version: 4,
            closeReason: null, errandTitle: 'Pick up a cake', errandStatus: 'OPEN',
            pickupArea: 'Ikeja', destinationArea: 'Magodo', createdAt: '2026-10-14T10:00:00.000Z',
          }], { nextCursor: 'cursor-2' });
      }),
    );

    renderWithQuery(<MyOffersPage />);
    expect(await screen.findByText('Counter received · Your turn')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load more offers' }));
    expect(await screen.findByText(/Closed: Errand Cancelled/)).toBeInTheDocument();
    expect(cursors).toEqual(['', 'cursor-2']);
  });
});
