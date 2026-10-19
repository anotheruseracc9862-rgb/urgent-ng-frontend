import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { AssignmentHubPage } from './hub/assignment-hub-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/assignments/assignment-hub-1',
  useSearchParams: () => new URLSearchParams(),
}));

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-assignment-hub' });

function renderPage(assignment: unknown, handlers: Parameters<typeof server.use> = []) {
  server.use(
    http.get('*/api/v1/assignments/assignment-hub-1', () => envelope(assignment)),
    http.get('*/api/v1/assignments/assignment-hub-1/timeline', () => envelope([
      { id: 'event-1', type: 'PICKED_UP', actorType: 'USER', actorId: 'runner-1', note: 'Collected package', mediaId: null, metadata: null, createdAt: '2026-01-01T10:00:00.000Z' },
    ])),
  );
  server.use(...handlers);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><AssignmentHubPage assignmentId="assignment-hub-1" /></QueryClientProvider>);
}

const baseAssignment = {
  id: 'assignment-hub-1',
  errandId: 'errand-1',
  offerId: 'offer-1',
  requesterId: 'requester-1',
  runnerId: 'runner-1',
  status: 'ACCEPTED',
  agreedAmountMinor: 550000,
  currency: 'NGN',
  selectedAt: '2026-01-01T09:00:00.000Z',
  acceptanceDeadline: '2026-01-01T09:30:00.000Z',
  acceptedAt: '2026-01-01T09:10:00.000Z',
  version: 2,
  role: 'RUNNER',
  errand: {
    id: 'errand-1',
    status: 'PICKED_UP',
    version: 3,
    category: {},
    title: 'Collect a parcel',
    description: 'Collect a sealed parcel.',
    instructions: null,
    priority: 'STANDARD',
    timeMode: 'ASAP',
    scheduledAt: null,
    itemSize: null,
    itemValueMinor: null,
    pickup: { area: 'Yaba', lga: 'Lagos Mainland', state: 'Lagos' },
    destination: { area: 'Ikeja', lga: 'Ikeja', state: 'Lagos' },
    pickupContact: null,
    dropoffContact: null,
    photos: [],
    expiresAt: null,
    autoCompleteAt: null,
    accessLevel: 'APPROXIMATE',
  },
};

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('assignment hub privacy', () => {
  it('shows only approximate locations when the API marks runner access approximate', async () => {
    renderPage({
      ...baseAssignment,
      errand: {
        ...baseAssignment.errand,
        pickup: { ...baseAssignment.errand.pickup, addressText: '99 Secret Street', landmark: 'Private gate' },
        pickupContact: { name: 'Private contact', phone: '+2348000000000' },
        accessLevel: 'APPROXIMATE',
      },
    });

    expect(await screen.findByText('Yaba, Lagos Mainland, Lagos')).toBeInTheDocument();
    expect(screen.getByText('Approximate details')).toBeInTheDocument();
    expect(screen.queryByText(/Secret Street|Private gate/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '+2348000000000' })).not.toBeInTheDocument();
    expect(await screen.findByText('Collected package')).toBeInTheDocument();
  });

  it('shows exact locations and contacts only when the API grants exact access', async () => {
    renderPage({
      ...baseAssignment,
      errand: {
        ...baseAssignment.errand,
        pickup: { ...baseAssignment.errand.pickup, addressText: '99 Secret Street', landmark: 'Private gate' },
        pickupContact: { name: 'Pickup contact', phone: '+2348000000000' },
        accessLevel: 'EXACT',
      },
    });

    expect(await screen.findByText('99 Secret Street, Private gate, Yaba, Lagos Mainland, Lagos')).toBeInTheDocument();
    expect(screen.getByText(/Pickup contact:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+2348000000000' })).toHaveAttribute('href', 'tel:+2348000000000');
  });

  it.each(['RUNNER', 'REQUESTER'])('shows authorized execution evidence to the %s', async (role) => {
    renderPage({ ...baseAssignment, role }, [
      http.get('*/api/v1/assignments/assignment-hub-1/timeline', () => envelope([
        { id: 'event-photo', type: 'PICKED_UP', note: 'Parcel collected', mediaId: 'pickup-photo', createdAt: '2026-01-01T10:00:00.000Z' },
      ])),
      http.get('*/api/v1/media/pickup-photo/url', () => envelope({ url: 'https://example.com/pickup.jpg' })),
    ]);
    expect(await screen.findByRole('img', { name: 'Picked Up evidence' })).toHaveAttribute('src', 'https://example.com/pickup.jpg');
  });

  it('offers arrival once and removes the action after the timeline confirms it', async () => {
    let arrived = false;
    const event = { id: 'arrival', type: 'ARRIVED', note: null, mediaId: null, createdAt: '2026-01-01T10:00:00.000Z' };
    renderPage({ ...baseAssignment, errand: { ...baseAssignment.errand, status: 'IN_PROGRESS' } }, [
      http.get('*/api/v1/assignments/assignment-hub-1/timeline', () => envelope(arrived ? [event] : [])),
      http.post('*/api/v1/assignments/assignment-hub-1/arrived', () => {
        arrived = true;
        return envelope(event);
      }),
    ]);
    await userEvent.click(await screen.findByRole('button', { name: 'I have arrived' }));
    expect(await screen.findByText('Arrived')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'I have arrived' })).not.toBeInTheDocument();
  });

  it('keeps pending details visible and reveals exact data after accepting through the hub', async () => {
    let accepted = false;
    renderPage(baseAssignment, [
      http.get('*/api/v1/assignments/assignment-hub-1', () => envelope({
        ...baseAssignment,
        status: accepted ? 'ACCEPTED' : 'PENDING_ACCEPTANCE',
        errand: {
          ...baseAssignment.errand,
          status: accepted ? 'ACCEPTED' : 'RUNNER_SELECTED',
          accessLevel: accepted ? 'EXACT' : 'APPROXIMATE',
          pickup: accepted ? { addressText: '99 Secret Street', area: 'Yaba' } : { area: 'Yaba' },
        },
      })),
      http.post('*/api/v1/assignments/assignment-hub-1/accept', () => {
        accepted = true;
        return envelope({ status: 'ACCEPTED' });
      }),
    ]);
    expect(await screen.findByText('Yaba')).toBeInTheDocument();
    expect(screen.queryByText(/99 Secret Street/)).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Accept assignment' }));
    expect(await screen.findByText('99 Secret Street, Yaba')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run errand' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept assignment' })).not.toBeInTheDocument();
  });
});

describe('assignment hub: rating a completed errand', () => {
  const user = { id: 'requester-1', name: 'Ada', firstName: 'Ada', lastName: 'Obi', phone: null, phoneVerified: true, status: 'ACTIVE', startMode: 'REQUESTER' } as unknown as Me;
  const mine = { id: 'r1', assignmentId: 'assignment-hub-1', direction: 'REQUESTER_TO_RUNNER', scores: { overall: 5 }, review: null, status: 'PUBLISHED', revealed: true, editable: false, editableUntil: '2026-10-01T00:00:00Z', createdAt: '2026-10-01T00:00:00Z' };

  function renderCompleted(ratings: unknown) {
    server.use(
      http.get('*/api/v1/assignments/assignment-hub-1', () => envelope({
        ...baseAssignment, role: 'REQUESTER', status: 'COMPLETED', completedAt: '2026-10-02T10:00:00.000Z',
        errand: { ...baseAssignment.errand, status: 'COMPLETED' },
      })),
      http.get('*/api/v1/assignments/assignment-hub-1/timeline', () => envelope([])),
      http.get('*/api/v1/assignments/assignment-hub-1/ratings', () => envelope(ratings)),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={client}><SessionProvider me={user}><AssignmentHubPage assignmentId="assignment-hub-1" /></SessionProvider></QueryClientProvider>);
  }

  it('an errand you have already rated shows "View your rating", not "Rate this errand"', async () => {
    renderCompleted({ canRate: false, reason: 'ALREADY_RATED', windowEndsAt: '2026-10-09T10:00:00.000Z', mine, theirs: null, counterpartRated: true });

    expect(await screen.findByRole('link', { name: 'View your rating' })).toHaveAttribute('href', '/assignments/assignment-hub-1/rating');
    expect(screen.queryByRole('link', { name: 'Rate this errand' })).not.toBeInTheDocument();
  });

  it('an errand nobody has rated yet offers "Rate this errand"', async () => {
    renderCompleted({ canRate: true, reason: null, windowEndsAt: '2099-01-01T00:00:00.000Z', mine: null, theirs: null, counterpartRated: false });

    expect(await screen.findByRole('link', { name: 'Rate this errand' })).toBeInTheDocument();
  });

  it('shows no rating button until it knows the rating state, rather than a wrong one', async () => {
    server.use(http.get('*/api/v1/assignments/assignment-hub-1/ratings', () => HttpResponse.json({ error: { code: 'SERVER_ERROR', message: 'x' }, requestId: 'r' }, { status: 500 })));
    renderCompleted({});
    server.use(http.get('*/api/v1/assignments/assignment-hub-1/ratings', () => HttpResponse.json({ error: { code: 'SERVER_ERROR', message: 'x' }, requestId: 'r' }, { status: 500 })));

    await screen.findByRole('heading', { name: 'Collect a parcel' });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.queryByRole('link', { name: 'Rate this errand' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View your rating' })).not.toBeInTheDocument();
  });
});
