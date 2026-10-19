import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { RunnerExecutionPage } from './runner-execution-page';

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-execution' });
const me: Me = {
  id: 'runner-1',
  name: 'Runner One',
  firstName: 'Runner',
  lastName: 'One',
  phone: '+2348031234567',
  phoneVerified: true,
  email: null,
  emailVerified: false,
  hasPassword: true,
  googleLinked: false,
  status: 'ACTIVE',
  startMode: 'RUNNER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(withLocationConsent = false) {
  let errandStatus = 'ACCEPTED';
  const assignment = () => ({
    id: 'execution-1',
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
    errand: { id: 'errand-1', status: errandStatus, accessLevel: 'EXACT' },
  });
  server.use(
    http.get('*/api/v1/me/consents', () => envelope({
      consents: withLocationConsent ? [{
        id: 'location-consent',
        type: 'LOCATION_SHARING',
        version: '1.0',
        acceptedAt: '2026-01-01T00:00:00.000Z',
        withdrawnAt: null,
      }] : [],
      outstanding: [],
    })),
    http.get('*/api/v1/assignments/execution-1/location', () => envelope({
      assignmentId: 'execution-1',
      errandStatus,
      sharing: 'STOPPED',
      freshness: 'NONE',
      point: null,
      capturedAt: null,
      ageSeconds: null,
      estimatedArrivalMinutes: null,
    })),
    http.get('*/api/v1/assignments/execution-1', () => envelope(assignment())),
    http.post('*/api/v1/assignments/execution-1/start', ({ request }) => {
      expect(request.headers.get('Idempotency-Key')).toBeTruthy();
      errandStatus = 'IN_PROGRESS';
      return envelope({ assignmentId: 'execution-1', errandId: 'errand-1', errandStatus, eventId: 'event-start', type: 'STARTED', at: new Date().toISOString() });
    }),
    http.post('*/api/v1/assignments/execution-1/pickup', async ({ request }) => {
      expect(request.headers.get('Idempotency-Key')).toBeTruthy();
      expect(await request.json()).toEqual({ note: 'Picked up safely.' });
      errandStatus = 'PICKED_UP';
      return envelope({ assignmentId: 'execution-1', errandId: 'errand-1', errandStatus, eventId: 'event-pickup', type: 'PICKED_UP', at: new Date().toISOString() });
    }),
    http.post('*/api/v1/assignments/execution-1/deliver', ({ request }) => {
      expect(request.headers.get('Idempotency-Key')).toBeTruthy();
      errandStatus = 'DELIVERED';
      return envelope({ assignmentId: 'execution-1', errandId: 'errand-1', errandStatus, eventId: 'event-delivery', type: 'DELIVERED', at: new Date().toISOString(), autoCompleteAt: '2026-01-02T10:00:00.000Z' });
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><SessionProvider me={me}><RunnerExecutionPage assignmentId="execution-1" /></SessionProvider></QueryClientProvider>);
  return (status: string) => { errandStatus = status; };
}

beforeAll(() => {
  listen();
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('runner execution steps', () => {
  it('exposes one legal next step at a time and refreshes before showing the following step', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('button', { name: 'Start errand' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm pickup' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start errand' }));
    const startDialog = await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: 'Confirm pickup' })).not.toBeInTheDocument();
    await user.click(within(startDialog).getByRole('button', { name: 'Start errand' }));
    expect(await screen.findByRole('button', { name: 'Confirm pickup' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start errand' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Pickup note'), 'Picked up safely.');
    await user.click(screen.getByRole('button', { name: 'Confirm pickup' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm pickup' }));
    expect(await screen.findByRole('button', { name: 'Confirm delivery' })).toBeInTheDocument();
    expect(screen.getByText(/Pickup recorded\. Next: take it to the drop-off/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step 3 of 3 · Record delivery' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm pickup' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm delivery' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm delivery' }));
    expect(await screen.findByText('Delivery recorded', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(/The requester now confirms it, or it completes by itself after 24 hours/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm delivery' })).not.toBeInTheDocument();
  });

  it('reuses the confirmed intent on retry instead of recording a second step', async () => {
    const user = userEvent.setup();
    renderPage();
    const keys: Array<string | null> = [];
    server.use(http.post('*/api/v1/assignments/execution-1/start', ({ request }) => {
      keys.push(request.headers.get('Idempotency-Key'));
      return HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Unavailable' }, requestId: 'retry-step' }, { status: 500 });
    }));
    await user.click(await screen.findByRole('button', { name: 'Start errand' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Start errand' }));
    expect(await within(dialog).findByText('Request ID: retry-step')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Start errand' }));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    await user.click(within(dialog).getByRole('button', { name: 'Go back' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(keys).toHaveLength(2);
  });

  it('refreshes a conflicting step and closes its confirmation before offering the next one', async () => {
    const user = userEvent.setup();
    const setStatus = renderPage();
    server.use(http.post('*/api/v1/assignments/execution-1/start', () => {
      setStatus('IN_PROGRESS');
      return HttpResponse.json({ error: { code: 'ERRAND_INVALID_STATE', message: 'Already started' }, requestId: 'step-conflict' }, { status: 409 });
    }));
    await user.click(await screen.findByRole('button', { name: 'Start errand' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Start errand' }));
    expect(await screen.findByText('The errand status changed. We refreshed the available next step.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Confirm pickup' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start errand' })).not.toBeInTheDocument();
  });

  it('leaves execution available when the browser denies location permission', async () => {
    const user = userEvent.setup();
    const original = navigator.geolocation;
    const denied = {
      code: 1,
      message: 'Permission denied',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error(denied),
        watchPosition: () => 1,
        clearWatch: () => undefined,
      } as Geolocation,
    });
    try {
      renderPage(true);
      await user.click(await screen.findByRole('button', { name: 'Start location sharing' }));
      expect(await screen.findByText(/Location permission was denied/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start errand' })).toBeInTheDocument();
    } finally {
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: original });
    }
  });
});
