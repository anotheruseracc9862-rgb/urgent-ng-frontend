import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Me } from '@/lib/api/types';
import { SessionProvider } from '@/lib/auth/client';
import { listen, server } from '@/test/msw/server';
import type { Errand } from '../api';
import { PostErrandForm } from './post-errand-form';

vi.mock('@/lib/google-maps', () => ({
  loadGoogleMaps: () => Promise.reject(new Error('Google Maps is not configured.')),
}));

const me = {
  id: 'requester-1', name: 'Ada Lovelace', firstName: 'Ada', lastName: 'Lovelace', phone: '+2348031234567', phoneVerified: true,
  email: null, emailVerified: false, hasPassword: true, googleLinked: false, status: 'ACTIVE', startMode: 'REQUESTER',
  photoMediaId: null, bio: null, homeArea: null, deletionScheduledAt: null, createdAt: '2025-03-10T00:00:00.000Z',
} as Me;

const service = { id: 'c0c0c0c0-27a1-4a23-a67b-6e69c03ce541', key: 'home_cleaning', name: 'Home Cleaning', requiresPickup: false, requiresDestination: true, flow: 'SERVICE' as const, isPopular: true };

/** A service draft that already has an address, a saved photo and a contact, as after a first save. */
const draft: Errand = {
  id: 'errand-1', version: 1, status: 'DRAFT', category: { id: service.id, key: service.key, name: service.name, flow: 'SERVICE' },
  priority: 'STANDARD', title: 'Clean my flat', description: 'Two bedrooms.', instructions: null, timeMode: 'ASAP', scheduledAt: null,
  suggestedBudgetMinor: null, itemSize: null, itemValueMinor: null, pickup: null,
  destination: { area: 'Lekki', lga: null, state: 'Lagos', accessLevel: 'EXACT', exact: { lat: 6.4474, lng: 3.4723 }, addressText: '12 Admiralty Way', landmark: null } as unknown as Errand['destination'],
  pickupContact: null, dropoffContact: null, photos: [{ mediaId: 'media-1', position: 0 }], assignment: null, publishedAt: null, expiresAt: null,
  autoCompleteAt: null, cancelledAt: null, cancellationReason: null, offerCount: 0, extended: false,
  createdAt: '2026-10-13T10:00:00.000Z', updatedAt: '2026-10-13T10:00:00.000Z',
} as Errand;

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-autosave' });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());

/**
 * The form saves by itself. These tests watch the requests it makes against a server that keeps what
 * it is sent, the way the real one does, and check that saving settles instead of going round again.
 */
describe('post errand form autosave', () => {
  function fakeServer(options: { photos?: boolean; roundPoints?: boolean } = {}) {
    let saved: Errand = structuredClone(draft);
    if (options.photos === false) saved.photos = [];
    const mediaRecord = { id: 'media-1', purpose: 'ERRAND_PHOTO', status: 'READY', rejectionReason: null };
    const patches: Array<Record<string, unknown>> = [];
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([service])),
      http.get('*/api/v1/errands/errand-1', () => envelope(saved)),
      http.get('*/api/v1/me/consents', () => envelope({ consents: [] })),
      http.get('*/api/v1/media/media-1', () => envelope(mediaRecord)),
      http.post('*/api/v1/media/uploads', () => envelope({
        media: { ...mediaRecord, status: 'PENDING' },
        upload: { method: 'PUT', url: '/api/v1/media/media-1/content', headers: { 'Content-Type': 'image/png' }, expiresAt: '2026-01-01T00:15:00.000Z' },
      })),
      http.put('*/api/v1/media/media-1/content', () => new HttpResponse(null, { status: 204 })),
      http.post('*/api/v1/media/media-1/confirm', () => envelope(mediaRecord)),
      http.get('*/api/v1/media/media-1/url', () => envelope({ url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' })),
      http.patch('*/api/v1/errands/errand-1', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patches.push(body);
        const next = structuredClone(saved) as unknown as Record<string, unknown>;
        for (const [key, value] of Object.entries(body)) {
          if (key === 'expectedVersion') continue;
          if (key === 'photoMediaIds') next.photos = (value as string[]).map((mediaId, position) => ({ mediaId, position }));
          else if (key === 'destination' && value) {
            const place = value as { point: { lat: number; lng: number }; addressText?: string; landmark?: string };
            // A stored point comes back with a rounding of its own, as from the real database.
            const jitter = options.roundPoints ? 3e-10 : 0;
            next.destination = { area: 'Lekki', lga: null, state: 'Lagos', accessLevel: 'EXACT', exact: { lat: place.point.lat + jitter, lng: place.point.lng - jitter }, addressText: place.addressText ?? null, landmark: place.landmark ?? null };
          } else next[key] = value;
        }
        next.version = (saved.version ?? 0) + 1;
        saved = next as unknown as Errand;
        return envelope(saved);
      }),
    );
    return { patches };
  }

  function renderForm() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><SessionProvider me={me}><PostErrandForm errandId="errand-1" /></SessionProvider></QueryClientProvider>);
  }

  it('does not save at all when nothing was changed, even with a photo and an address on the draft', async () => {
    const { patches } = fakeServer();
    renderForm();
    await screen.findByDisplayValue('Clean my flat');
    await screen.findByLabelText('Ready');
    await sleep(2500);
    expect(patches).toHaveLength(0);
  });

  it('saves a typed contact once, then settles: no second round of saving, with a photo on the draft', async () => {
    const user = userEvent.setup();
    const { patches } = fakeServer();
    renderForm();
    await screen.findByLabelText('Ready');

    await user.type(screen.getByLabelText('Name'), 'Christian Atam');
    await user.type(screen.getByLabelText('Phone'), '08147877487');
    await screen.findByText('Draft saved', {}, { timeout: 4000 });

    const settled = patches.length;
    expect(settled).toBeGreaterThanOrEqual(1);
    expect(patches.at(-1)).toMatchObject({ dropoffContact: { name: 'Christian Atam', phone: '+2348147877487' } });
    await sleep(3000);
    expect(patches).toHaveLength(settled);
    expect(screen.getByText('Draft saved')).toBeInTheDocument();
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
  });

  it('saves a newly uploaded photo once and settles', async () => {
    URL.createObjectURL = vi.fn().mockReturnValue('blob:preview');
    URL.revokeObjectURL = vi.fn();
    const { patches } = fakeServer({ photos: false });
    renderForm();
    await screen.findByDisplayValue('Clean my flat');

    fireEvent.change(screen.getByLabelText('Choose images'), { target: { files: [new File(['test'], 'flat.png', { type: 'image/png' })] } });
    await screen.findByLabelText('Ready', {}, { timeout: 5000 });
    await screen.findByText('Draft saved', {}, { timeout: 4000 });

    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ photoMediaIds: ['media-1'] });
    await sleep(3000);
    expect(patches).toHaveLength(1);
    expect(screen.getByText('Draft saved')).toBeInTheDocument();
  });

  it('saves a moved pin once even when the server hands the point back slightly rounded', async () => {
    const user = userEvent.setup();
    const { patches } = fakeServer({ roundPoints: true });
    renderForm();
    await screen.findByDisplayValue('Clean my flat');

    await user.clear(await screen.findByLabelText('Latitude'));
    await user.type(screen.getByLabelText('Latitude'), '6.5244123456789');
    await user.clear(screen.getByLabelText('Longitude'));
    await user.type(screen.getByLabelText('Longitude'), '3.3792987654321');
    await user.click(screen.getByRole('button', { name: 'Set manual coordinates' }));
    await screen.findByText('Draft saved', {}, { timeout: 4000 });

    const settled = patches.length;
    expect(settled).toBeGreaterThanOrEqual(1);
    await sleep(3000);
    expect(patches).toHaveLength(settled);
  });

  it('shows one short word while saving, never two different messages', async () => {
    const user = userEvent.setup();
    fakeServer();
    renderForm();
    await screen.findByLabelText('Ready');
    const seen = new Set<string>();
    const watcher = setInterval(() => {
      for (const text of ['Saving…', 'Saving draft…', 'Unsaved changes are being saved…', 'Draft saved']) {
        if (screen.queryByText(text)) seen.add(text);
      }
    }, 10);
    await user.type(screen.getByLabelText('Name'), 'Chris');
    await screen.findByText('Draft saved', {}, { timeout: 4000 });
    clearInterval(watcher);
    expect(seen.has('Saving draft…')).toBe(false);
    expect(seen.has('Unsaved changes are being saved…')).toBe(false);
    expect(seen.has('Saving…')).toBe(true);
  });
});
