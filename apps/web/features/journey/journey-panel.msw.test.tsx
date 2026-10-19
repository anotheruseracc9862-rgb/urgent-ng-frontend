import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { AssignmentJourney } from './assignment-journey';
import { OfferJourney } from './offer-journey';
import { JourneyHere } from './journey-context';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/somewhere-else',
  useSearchParams: () => new URLSearchParams(),
}));

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-journey' });
const me = (id: string) => ({ id, name: 'Test User', firstName: 'Test', lastName: 'User', phone: null, phoneVerified: true, status: 'ACTIVE', startMode: 'RUNNER' }) as unknown as Me;

const assignment = (role: 'RUNNER' | 'REQUESTER', status: string, errandStatus: string) => ({
  id: 'a1', errandId: 'e1', offerId: 'o1', requesterId: 'req-1', runnerId: 'run-1', status, role,
  agreedAmountMinor: 520000, currency: 'NGN', selectedAt: '2026-10-19T09:00:00.000Z', acceptanceDeadline: '2026-10-19T09:30:00.000Z',
  version: 1, errand: { id: 'e1', status: errandStatus, title: 'Pick up a cake' },
});

function renderIn(ui: React.ReactNode, userId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><SessionProvider me={me(userId)}>{ui}</SessionProvider></QueryClientProvider>);
}

const currentStep = () => screen.getByRole('list').querySelector('[aria-current="step"]')?.textContent ?? '';

beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());

describe('journey steps on an assignment', () => {
  it('shows the steps for the runner, and only the steps: no card, no button, no extra text', async () => {
    server.use(http.get('*/api/v1/assignments/a1', () => envelope(assignment('RUNNER', 'PENDING_ACCEPTANCE', 'RUNNER_SELECTED'))));

    renderIn(<AssignmentJourney assignmentId="a1"><JourneyHere /></AssignmentJourney>, 'run-1');

    const steps = await screen.findByRole('list');
    expect(within(steps).getAllByRole('listitem')).toHaveLength(7);
    expect(currentStep()).toContain('Accept job');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/sees/i)).not.toBeInTheDocument();
  });

  it('the requester sees the same moment under their own labels', async () => {
    server.use(http.get('*/api/v1/assignments/a1', () => envelope(assignment('REQUESTER', 'PENDING_ACCEPTANCE', 'RUNNER_SELECTED'))));

    renderIn(<AssignmentJourney assignmentId="a1"><JourneyHere /></AssignmentJourney>, 'req-1');

    await screen.findByRole('list');
    expect(currentStep()).toContain('Select runner');
  });

  it('moves to the errand running once payment terms are confirmed', async () => {
    server.use(
      http.get('*/api/v1/assignments/a1', () => envelope(assignment('RUNNER', 'ACCEPTED', 'ACCEPTED'))),
      http.get('*/api/v1/assignments/a1/payment-agreement', () => envelope({ assignmentId: 'a1', agreedAmountMinor: 520000, currency: 'NGN', paymentMethod: 'CASH', paymentTiming: 'AT_DELIVERY', confirmedByRequesterAt: '2026-10-19T09:40:00.000Z', confirmedByRunnerAt: '2026-10-19T09:41:00.000Z', fullyConfirmed: true })),
    );

    renderIn(<AssignmentJourney assignmentId="a1"><JourneyHere /></AssignmentJourney>, 'run-1');

    await screen.findByRole('list');
    await vi.waitFor(() => expect(currentStep()).toContain('Run errand'));
  });

  it('draws nothing when the assignment cannot be loaded, and the page still renders', async () => {
    server.use(http.get('*/api/v1/assignments/a1', () => HttpResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'no' }, requestId: 'r' }, { status: 404 })));

    renderIn(<AssignmentJourney assignmentId="a1"><p>the page</p><JourneyHere /></AssignmentJourney>, 'run-1');
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(screen.getByText('the page')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('journey steps on an offer', () => {
  const offer = (over: Record<string, unknown> = {}) => ({
    id: 'o1', errandId: 'e1', runnerId: 'run-1', requesterId: 'req-1', amountMinor: 520000, durationMinutes: 30,
    status: 'ACTIVE', awaitingParty: 'RUNNER', version: 2, needsReconfirmation: false, closeReason: null, conversationId: null,
    createdAt: '2026-10-19T08:00:00.000Z', updatedAt: '2026-10-19T08:10:00.000Z', availabilityConfirmedAt: null, message: null,
    assignmentId: null, errandTitle: 'Pick up a cake', roundsUsed: 0, roundsLimit: 6, history: [], ...over,
  });

  it('is at Negotiate while the offer is active', async () => {
    server.use(http.get('*/api/v1/offers/o1', () => envelope(offer())));

    renderIn(<OfferJourney offerId="o1"><JourneyHere /></OfferJourney>, 'run-1');

    await screen.findByRole('list');
    expect(currentStep()).toContain('Negotiate');
  });

  it('follows the assignment once the offer is selected', async () => {
    server.use(
      http.get('*/api/v1/offers/o1', () => envelope(offer({ status: 'SELECTED', assignmentId: 'a1' }))),
      http.get('*/api/v1/assignments/a1', () => envelope(assignment('RUNNER', 'ACCEPTED', 'IN_PROGRESS'))),
    );

    renderIn(<OfferJourney offerId="o1"><JourneyHere /></OfferJourney>, 'run-1');

    await screen.findByRole('list');
    await vi.waitFor(() => expect(currentStep()).toContain('Run errand'));
  });
});
