import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { LiveTrackingPage } from './live-tracking-page';

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-live-track' });

function renderPage(location: Record<string, unknown>) {
  server.use(
    http.get('*/api/v1/assignments/live-track-1', () => envelope({
      id: 'live-track-1',
      errandId: 'errand-1',
      offerId: 'offer-1',
      requesterId: 'requester-1',
      runnerId: 'runner-1',
      status: 'ACCEPTED',
      agreedAmountMinor: 100000,
      currency: 'NGN',
      selectedAt: '2026-01-01T09:00:00.000Z',
      acceptanceDeadline: '2026-01-01T09:30:00.000Z',
      version: 1,
      role: 'REQUESTER',
      errand: { id: 'errand-1', title: 'Tracking errand', status: 'IN_PROGRESS', accessLevel: 'EXACT' },
    })),
    http.get('*/api/v1/assignments/live-track-1/location', () => envelope({
      assignmentId: 'live-track-1',
      errandStatus: 'IN_PROGRESS',
      sharing: 'ACTIVE',
      freshness: 'EXPIRED',
      point: null,
      capturedAt: null,
      ageSeconds: null,
      estimatedArrivalMinutes: null,
      ...location,
    })),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><LiveTrackingPage assignmentId="live-track-1" /></QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('live tracking for a service', () => {
  it('says there is nothing to follow, and never asks for a location', async () => {
    const asked = vi.fn();
    server.use(
      http.get('*/api/v1/assignments/live-track-1', () => envelope({
        id: 'live-track-1', errandId: 'errand-1', offerId: 'o', requesterId: 'requester-1', runnerId: 'runner-1', status: 'ACCEPTED',
        agreedAmountMinor: 100000, currency: 'NGN', selectedAt: '2026-01-01T09:00:00.000Z', acceptanceDeadline: '2026-01-01T09:30:00.000Z',
        version: 1, role: 'REQUESTER',
        errand: { id: 'errand-1', title: 'Clean my flat', status: 'IN_PROGRESS', accessLevel: 'EXACT', category: { id: 'c', key: 'home_cleaning', name: 'Home Cleaning', flow: 'SERVICE' } },
      })),
      http.get('*/api/v1/assignments/live-track-1/location', () => { asked(); return HttpResponse.json({ error: { code: 'LOCATION_NOT_AVAILABLE', message: 'x' }, requestId: 'r' }, { status: 404 }); }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LiveTrackingPage assignmentId="live-track-1" /></QueryClientProvider>);

    expect(await screen.findByText('Nothing to follow')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to assignment' })).toHaveAttribute('href', '/assignments/live-track-1');
    expect(screen.queryByText(/We could not load live tracking/)).not.toBeInTheDocument();
    expect(asked).not.toHaveBeenCalled();
  });
});

describe('requester live tracking', () => {
  it('does not render a pin for an expired location', async () => {
    renderPage({});
    expect(await screen.findByText('The last location expired. A pin will appear after the runner shares a fresh position.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Approximate runner location map' })).not.toBeInTheDocument();
  });

  it('labels stale positions and shows an ETA only when the API provides one', async () => {
    renderPage({
      freshness: 'STALE',
      point: { lat: 6.52, lng: 3.38 },
      capturedAt: '2026-05-01T10:00:00.000Z',
      ageSeconds: 90,
      estimatedArrivalMinutes: 12,
    });
    expect(await screen.findByText('Location may be out of date.')).toBeInTheDocument();
    expect(screen.getByText('Estimated arrival: 12 minutes')).toBeInTheDocument();
    expect(screen.getByText(/Last update:/)).toBeInTheDocument();
  });
});
