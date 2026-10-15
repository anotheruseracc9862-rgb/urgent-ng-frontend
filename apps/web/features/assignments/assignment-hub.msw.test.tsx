import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { AssignmentHubPage } from './hub/assignment-hub-page';

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-assignment-hub' });

function renderPage(assignment: unknown) {
  server.use(
    http.get('*/api/v1/assignments/assignment-hub-1', () => envelope(assignment)),
    http.get('*/api/v1/assignments/assignment-hub-1/timeline', () => envelope([
      { id: 'event-1', type: 'PICKED_UP', actorType: 'USER', actorId: 'runner-1', note: 'Collected package', mediaId: null, metadata: null, createdAt: '2026-01-01T10:00:00.000Z' },
    ])),
  );
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
        accessLevel: 'APPROXIMATE',
      },
    });

    expect(await screen.findByText('Yaba, Lagos Mainland, Lagos')).toBeInTheDocument();
    expect(screen.getByText('Approximate details')).toBeInTheDocument();
    expect(screen.queryByText(/Secret Street|Private gate/)).not.toBeInTheDocument();
    expect(screen.getByText('Collected package')).toBeInTheDocument();
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
});
