import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { RunnerLocationSharing } from './runner-location-sharing';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/assignments/a1/run',
  useSearchParams: () => new URLSearchParams(),
}));

const me = { id: 'run-1', name: 'Tunde Okon', firstName: 'Tunde', lastName: 'Okon', phone: null, phoneVerified: true, status: 'ACTIVE', startMode: 'RUNNER' } as unknown as Me;
const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-loc' });
const consents = { consents: [{ id: 'c1', type: 'LOCATION_SHARING', version: '1', acceptedAt: '2026-10-01T00:00:00.000Z', withdrawnAt: null }] };
const live = (ageSeconds: number | null) => ({
  assignmentId: 'a1', errandStatus: 'IN_PROGRESS', sharing: 'ACTIVE', freshness: ageSeconds === null ? 'NONE' : 'FRESH',
  point: null, capturedAt: ageSeconds === null ? null : new Date(Date.now() - ageSeconds * 1000).toISOString(), ageSeconds, estimatedArrivalMinutes: null,
});

let positions: Array<(position: GeolocationPosition) => void> = [];
const position = () => ({ coords: { latitude: 6.5244, longitude: 3.3792, accuracy: 20 }, timestamp: Date.now() }) as unknown as GeolocationPosition;

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SessionProvider me={me}><RunnerLocationSharing assignmentId="a1" /></SessionProvider></QueryClientProvider>);
}

beforeAll(() => listen());
beforeEach(() => {
  positions = [];
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: (success: (position: GeolocationPosition) => void) => { positions.push(success); return 1; },
      clearWatch: vi.fn(),
      getCurrentPosition: vi.fn(),
    },
  });
});
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());

describe('runner location sharing', () => {
  it('sends a position when the server has none yet', async () => {
    const posted = vi.fn();
    server.use(
      http.get('*/api/v1/me/consents', () => envelope(consents)),
      http.get('*/api/v1/assignments/a1/location', () => envelope(live(null))),
      http.post('*/api/v1/assignments/a1/location', () => { posted(); return envelope({ recorded: true }); }),
    );

    renderCard();
    await screen.findByText(/Sharing is on/);
    await waitFor(() => expect(positions.length).toBeGreaterThan(0));
    act(() => positions[0](position()));

    await waitFor(() => expect(posted).toHaveBeenCalledTimes(1));
  });

  it('does not send another position when the server got one a few seconds ago, so it is never refused', async () => {
    const posted = vi.fn();
    server.use(
      http.get('*/api/v1/me/consents', () => envelope(consents)),
      http.get('*/api/v1/assignments/a1/location', () => envelope(live(5))),
      http.post('*/api/v1/assignments/a1/location', () => { posted(); return envelope({ recorded: true }); }),
    );

    renderCard();
    await screen.findByText(/Sharing is on/);
    await waitFor(() => expect(positions.length).toBeGreaterThan(0));
    act(() => positions[0](position()));
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(posted).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a refusal for sending too soon is a quiet note, not a red error, and sharing stays on', async () => {
    server.use(
      http.get('*/api/v1/me/consents', () => envelope(consents)),
      http.get('*/api/v1/assignments/a1/location', () => envelope(live(null))),
      http.post('*/api/v1/assignments/a1/location', () => HttpResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Location updates are limited.', details: { retryAfterSeconds: 12 } }, requestId: 'r' },
        { status: 429 },
      )),
    );

    renderCard();
    await screen.findByText(/Sharing is on/);
    await waitFor(() => expect(positions.length).toBeGreaterThan(0));
    act(() => positions[0](position()));

    expect(await screen.findByText(/shared a moment ago/)).toBeInTheDocument();
    expect(screen.queryByText(/arriving too quickly/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop sharing' })).toBeInTheDocument();
  });
});
