import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { AssignmentJourney } from './assignment-journey';
import { OfferJourney } from './offer-journey';

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

beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());

describe('journey bar on an assignment', () => {
  it('runner who was selected sees the job to accept and what the requester sees', async () => {
    server.use(http.get('*/api/v1/assignments/a1', () => envelope(assignment('RUNNER', 'PENDING_ACCEPTANCE', 'RUNNER_SELECTED'))));

    renderIn(<AssignmentJourney assignmentId="a1" />, 'run-1');

    expect(await screen.findByRole('heading', { name: 'You were selected: accept or decline' })).toBeInTheDocument();
    expect(screen.getByText('Your move')).toBeInTheDocument();
    expect(screen.getByText(/What the requester sees/)).toBeInTheDocument();
    const step = within(screen.getByRole('list')).getByText('Accept job');
    expect(step.closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('the requester sees the same moment from the other side', async () => {
    server.use(http.get('*/api/v1/assignments/a1', () => envelope(assignment('REQUESTER', 'PENDING_ACCEPTANCE', 'RUNNER_SELECTED'))));

    renderIn(<AssignmentJourney assignmentId="a1" />, 'req-1');

    expect(await screen.findByRole('heading', { name: 'Waiting for the runner to accept' })).toBeInTheDocument();
    expect(screen.getByText(/What the runner sees/)).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText('Select runner')).toBeInTheDocument();
  });

  it('reads the payment terms once accepted', async () => {
    server.use(
      http.get('*/api/v1/assignments/a1', () => envelope(assignment('RUNNER', 'ACCEPTED', 'ACCEPTED'))),
      http.get('*/api/v1/assignments/a1/payment-agreement', () => envelope({ assignmentId: 'a1', agreedAmountMinor: 520000, currency: 'NGN', paymentMethod: 'CASH', paymentTiming: 'AT_DELIVERY', confirmedByRequesterAt: '2026-10-19T09:40:00.000Z', confirmedByRunnerAt: null, fullyConfirmed: false })),
    );

    renderIn(<AssignmentJourney assignmentId="a1" />, 'run-1');

    expect(await screen.findByRole('heading', { name: 'Agree how you will be paid' })).toBeInTheDocument();
    expect(await screen.findByText(/already confirmed and are waiting for you/)).toBeInTheDocument();
  });

  it('renders nothing when the assignment cannot be loaded', async () => {
    server.use(http.get('*/api/v1/assignments/a1', () => HttpResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'no' }, requestId: 'r' }, { status: 404 })));

    const { container } = renderIn(<AssignmentJourney assignmentId="a1" />, 'run-1');
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(container).toBeEmptyDOMElement();
  });
});

describe('journey bar on an offer', () => {
  const offer = (over: Record<string, unknown> = {}) => ({
    id: 'o1', errandId: 'e1', runnerId: 'run-1', requesterId: 'req-1', amountMinor: 520000, durationMinutes: 30,
    status: 'ACTIVE', awaitingParty: 'RUNNER', version: 2, needsReconfirmation: false, closeReason: null, conversationId: null,
    createdAt: '2026-10-19T08:00:00.000Z', updatedAt: '2026-10-19T08:10:00.000Z', availabilityConfirmedAt: null, message: null,
    assignmentId: null, errandTitle: 'Pick up a cake', history: [], ...over,
  });

  it('shows whose turn it is to each side', async () => {
    server.use(http.get('*/api/v1/offers/o1', () => envelope(offer())));

    renderIn(<OfferJourney offerId="o1" />, 'run-1');
    expect(await screen.findByRole('heading', { name: 'Your turn' })).toBeInTheDocument();
    cleanup();

    renderIn(<OfferJourney offerId="o1" />, 'req-1');
    expect(await screen.findByRole('heading', { name: 'Waiting for the runner' })).toBeInTheDocument();
  });

  it('follows the assignment once the offer is selected', async () => {
    server.use(
      http.get('*/api/v1/offers/o1', () => envelope(offer({ status: 'SELECTED', assignmentId: 'a1' }))),
      http.get('*/api/v1/assignments/a1', () => envelope(assignment('RUNNER', 'PENDING_ACCEPTANCE', 'RUNNER_SELECTED'))),
    );

    renderIn(<OfferJourney offerId="o1" />, 'run-1');

    expect(await screen.findByRole('heading', { name: 'You were selected: accept or decline' })).toBeInTheDocument();
  });
});
