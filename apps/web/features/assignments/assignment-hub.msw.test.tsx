import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { AssignmentHubPage } from './hub/assignment-hub-page';

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
    expect(screen.getByRole('link', { name: 'Continue errand' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept assignment' })).not.toBeInTheDocument();
  });
});
