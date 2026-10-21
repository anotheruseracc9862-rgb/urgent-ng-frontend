import { cleanup, render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { SharedErrandPage } from './shared-errand-page';
import { ShareManagementPage } from './share-management-page';

vi.mock('@/components/map/MapProvider', () => ({ MapProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/features/location/track/rounded-live-location-map', () => ({ RoundedLiveLocationMap: ({ point }: { point: { lat: number; lng: number } }) => <div role="img" aria-label="Approximate runner location map">{point.lat}, {point.lng}</div> }));
const envelope = (data: unknown) => HttpResponse.json({ data, requestId: 'share-test' });
function render(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
const failure = () => HttpResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Unavailable' }, requestId: 'share-test' }, { status: 404 });
const fixture = () => ({
  title: 'Private title with 42 Secret Street', category: 'Delivery', requesterFirstName: 'Ada',
  runner: { firstName: 'Tunde', lastInitial: 'O', verified: true, phone: '+2348099999999', address: '42 Secret Street', photoUrl: null, ratingAverage: 4.9, ratingCount: 30 },
  status: 'PICKED_UP', checkpoints: [{ type: 'PICKED_UP', at: new Date().toISOString(), address: '42 Secret Street' }],
  pickup: { area: 'Victoria Island', address: '42 Secret Street', phone: '+2348099999999', lat: 6.5, lng: 3.4 }, destination: { area: 'Ikoyi', exactAddress: '42 Secret Street' },
  live: { freshness: 'FRESH', lat: 6.52, lng: 3.38, capturedAt: new Date().toISOString(), exactLat: 6.523456 },
  lastUpdatedAt: new Date().toISOString(), expectedDeliveryAt: new Date(Date.now() + 3600000).toISOString(), linkExpiresAt: new Date(Date.now() + 86400000).toISOString(), phone: '+2348099999999', address: '42 Secret Street',
});
beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

it('renders only safe fields, server-rounded live point and concern confirmation without persistence', async () => {
  const user = userEvent.setup();
  let body: unknown;
  server.use(http.get('*/api/v1/shared/private-token', () => envelope(fixture())), http.post('*/api/v1/shared/private-token/concern', async ({ request }) => { body = await request.json(); return envelope({ received: true }); }));
  render(<SharedErrandPage token="private-token" />);
  expect(await screen.findByText('Victoria Island')).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveTextContent('6.52, 3.38');
  expect(document.body).not.toHaveTextContent('42 Secret Street');
  expect(document.body).not.toHaveTextContent('+2348099999999');
  expect(document.body).not.toHaveTextContent('6.523456');
  await user.type(screen.getByLabelText('Details (optional)'), 'Delivery is late');
  await user.click(screen.getByRole('button', { name: 'Send concern' }));
  expect(await screen.findByText(/Concern received/)).toBeInTheDocument();
  expect(body).toEqual({ message: 'Delivery is late' });
  expect(JSON.stringify(localStorage)).not.toContain('private-token');
  expect(JSON.stringify(sessionStorage)).not.toContain('private-token');
});

it.each(['expired', 'revoked'])('uses the same unavailable view for %s links', async token => {
  server.use(http.get(`*/api/v1/shared/${token}`, failure));
  render(<SharedErrandPage token={token} />);
  expect(await screen.findByRole('heading', { name: 'This link is unavailable' })).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('hides expired links even if a stale successful response arrives', async () => {
  server.use(http.get('*/api/v1/shared/old', () => envelope({ ...fixture(), linkExpiresAt: '2020-01-01T00:00:00Z' })));
  render(<SharedErrandPage token="old" />);
  expect(await screen.findByText('This link is unavailable')).toBeInTheDocument();
  expect(screen.queryByText('Victoria Island')).not.toBeInTheDocument();
});

it.each(['EXPIRED', 'NONE'])('never displays a pin for %s live data', async freshness => {
  const data = fixture(); data.live.freshness = freshness;
  server.use(http.get('*/api/v1/shared/no-pin', () => envelope(data)));
  render(<SharedErrandPage token="no-pin" />);
  expect(await screen.findByText(/No recent location/)).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

it('creates with a stable retry key, copies once, revokes and never caches the secret', async () => {
  const user = userEvent.setup();
  const keys: string[] = [];
  let links: unknown[] = [];
  server.use(
    http.get('*/api/v1/errands/e1/trusted-contact', () => envelope(links)),
    http.post('*/api/v1/errands/e1/trusted-contact', ({ request }) => {
      keys.push(request.headers.get('Idempotency-Key')!);
      if (keys.length === 1) return HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Retry' } }, { status: 500 });
      links = [{ id: 's1', status: 'ACTIVE', createdByMe: true, expiresAt: fixture().linkExpiresAt, createdAt: new Date().toISOString(), viewCount: 0 }];
      return envelope({ id: 's1', token: 'show-once-secret', path: '/shared/show-once-secret', expiresAt: fixture().linkExpiresAt });
    }),
    http.delete('*/api/v1/trusted-contact/s1', () => { links = [{ ...(links[0] as object), status: 'REVOKED' }]; return envelope(links[0]); }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ShareManagementPage errandId="e1" /></QueryClientProvider>);
  await screen.findByText(/No links yet/);
  await user.click(screen.getByRole('button', { name: 'Create link' }));
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: 'Create link' }));
  expect(await screen.findByLabelText('Private sharing link')).toHaveValue('http://localhost:3000/shared/show-once-secret');
  expect(keys[0]).toBe(keys[1]);
  await user.click(screen.getByRole('button', { name: 'Copy link' }));
  expect(await screen.findByText('Link copied.')).toBeInTheDocument();
  expect(JSON.stringify(client.getQueryData(['trusted-contact', 'list', 'e1']))).not.toContain('show-once-secret');
  await user.click(await screen.findByRole('button', { name: 'Revoke link' }));
  await waitFor(() => expect(screen.queryByLabelText('Private sharing link')).not.toBeInTheDocument());
  expect(await screen.findByText(/REVOKED/)).toBeInTheDocument();
  client.clear();
});

it('does not refresh or navigate to sign-in when a public call fails authentication', async () => {
  let refreshes = 0;
  const navigation = vi.fn();
  window.addEventListener('urgent:auth-navigation', navigation);
  server.use(
    http.get('*/api/v1/shared/no-auth', () => HttpResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Auth required' } }, { status: 401 })),
    http.post('*/api/v1/auth/refresh', () => { refreshes++; return envelope({}); }),
  );
  render(<SharedErrandPage token="no-auth" />);
  expect(await screen.findByText('Unable to load progress')).toBeInTheDocument();
  expect(refreshes).toBe(0);
  expect(navigation).not.toHaveBeenCalled();
  window.removeEventListener('urgent:auth-navigation', navigation);
});

it('removes private progress when a concern discovers that the link was revoked', async () => {
  const user = userEvent.setup();
  server.use(http.get('*/api/v1/shared/revoked-during-view', () => envelope(fixture())), http.post('*/api/v1/shared/revoked-during-view/concern', failure));
  render(<SharedErrandPage token="revoked-during-view" />);
  await screen.findByText('Victoria Island');
  await user.click(screen.getByRole('button', { name: 'Send concern' }));
  expect(await screen.findByText('This link is unavailable')).toBeInTheDocument();
  expect(screen.queryByText('Victoria Island')).not.toBeInTheDocument();
});

it('shows a service as work at one address, with no pickup and no delivery wording', async () => {
  server.use(http.get('*/api/v1/shared/service-token', () => envelope({
    ...fixture(), category: 'Car wash', categoryFlow: 'SERVICE', pickup: null, destination: { area: 'Lekki Phase 1', lat: 6.5, lng: 3.4 },
    live: null, status: 'PICKED_UP', checkpoints: [{ type: 'PICKED_UP', at: new Date().toISOString() }],
  })));
  render(<SharedErrandPage token="service-token" />);
  expect(await screen.findByText('Lekki Phase 1')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Work in progress' })).toBeInTheDocument();
  expect(screen.getByText('Service area')).toBeInTheDocument();
  expect(screen.getByText(/Work started/)).toBeInTheDocument();
  expect(screen.getByText(/Expected finish/)).toBeInTheDocument();
  expect(screen.queryByText('Pickup area')).not.toBeInTheDocument();
  expect(screen.queryByText('Drop-off area')).not.toBeInTheDocument();
  expect(screen.queryByText(/Item picked up/)).not.toBeInTheDocument();
});
