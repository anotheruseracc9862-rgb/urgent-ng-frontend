import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { useLocationSharingConsent } from './consent-state';
import { ConsentsPage } from './consents-page';

const me: Me = {
  id: 'user-consent-1',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
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
  createdAt: '2025-03-10T00:00:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-consents' });
const policyTypes = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'SAFETY_POLICY',
  'PROHIBITED_ITEMS_POLICY',
  'OFFLINE_PAYMENT_TERMS',
  'LOCATION_SHARING',
  'MARKETING_COMMUNICATIONS',
] as const;

function LocationConsentProbe() {
  const consent = useLocationSharingConsent();
  return <p role="status">Location sharing {consent.isEnabled ? 'enabled' : 'disabled'}</p>;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider me={me}>
        <ConsentsPage />
        <LocationConsentProbe />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe('privacy and consent settings', () => {
  it('withdraws and re-accepts location consent, updating the shared location-consent state', async () => {
    const user = userEvent.setup();
    const consentRecords = policyTypes.slice(0, 5).map((type, index) => ({
      id: `required-${index}`,
      type,
      version: '1.0',
      acceptedAt: '2026-01-10T12:00:00.000Z',
      withdrawnAt: null,
    }));
    consentRecords.push({
      id: 'location-consent-1',
      type: 'LOCATION_SHARING',
      version: '1.0',
      acceptedAt: '2026-02-10T12:00:00.000Z',
      withdrawnAt: null,
    });
    let withdrawCount = 0;
    let acceptanceCount = 0;
    let acceptedAt = '2026-02-10T12:00:00.000Z';
    let withdrawnAt: string | null = null;

    server.use(
      http.get('*/api/v1/me/consents', () => envelope({
        consents: [
          ...consentRecords.slice(0, 5),
          {
            id: acceptanceCount ? 'location-consent-2' : 'location-consent-1',
            type: 'LOCATION_SHARING',
            version: acceptanceCount ? '2.0' : '1.0',
            acceptedAt,
            withdrawnAt,
          },
        ],
        outstanding: [],
      })),
      http.get('*/api/v1/reference/policies', () => envelope(policyTypes.map((type) => ({
        id: `policy-${type}`,
        type,
        version: type === 'LOCATION_SHARING' ? '2.0' : '1.0',
        documentRef: `${type.toLowerCase()}/1`,
        publishedAt: '2026-01-01T00:00:00.000Z',
        requiresReacceptance: false,
      })))),
      http.post('*/api/v1/me/consents/location-consent-1/withdraw', () => {
        withdrawCount += 1;
        withdrawnAt = '2026-03-01T12:00:00.000Z';
        return new HttpResponse(null, { status: 204 });
      }),
      http.post('*/api/v1/me/consents', async ({ request }) => {
        const body = await request.json() as { type: string; version: string };
        expect(body).toEqual({ type: 'LOCATION_SHARING', version: '2.0' });
        acceptanceCount += 1;
        acceptedAt = '2026-03-02T12:00:00.000Z';
        withdrawnAt = null;
        return envelope({
          id: 'location-consent-2',
          type: body.type,
          version: body.version,
          acceptedAt,
          withdrawnAt: null,
        });
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Privacy & consents' })).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('Location sharing enabled');
    expect(screen.getByText('Required policies')).toBeInTheDocument();
    expect(screen.getByText('Consent history')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Withdraw consent' }));
    await waitFor(() => expect(withdrawCount).toBe(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Location sharing disabled');
    expect(screen.getByText('Withdrawn')).toBeInTheDocument();
    expect(screen.getByText(/Withdrawn\s+01 Mar 2026/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept again' }));
    await waitFor(() => expect(acceptanceCount).toBe(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Location sharing enabled');
    expect(screen.getByText(/version 2\.0/)).toBeInTheDocument();
  });

  it('keeps required policy controls read-only and links updated required policies to review', async () => {
    const requiredConsents = policyTypes.slice(0, 5).map((type, index) => ({
      id: `required-${index}`,
      type,
      version: '1.0',
      acceptedAt: '2026-01-10T12:00:00.000Z',
      withdrawnAt: null,
    }));
    server.use(
      http.get('*/api/v1/me/consents', () => envelope({
        consents: requiredConsents,
        outstanding: [{
          id: 'policy-terms-2',
          type: 'TERMS_OF_SERVICE',
          version: '2.0',
          documentRef: 'terms/2',
          publishedAt: '2026-02-01T00:00:00.000Z',
          requiresReacceptance: true,
        }],
      })),
      http.get('*/api/v1/reference/policies', () => envelope(policyTypes.map((type) => ({
        id: `policy-${type}`,
        type,
        version: '1.0',
        documentRef: `${type.toLowerCase()}/1`,
        publishedAt: '2026-01-01T00:00:00.000Z',
        requiresReacceptance: false,
      })))),
    );

    renderPage();

    expect(await screen.findByRole('link', { name: 'Review policy updates' })).toHaveAttribute('href', '/policy-acceptance');
    expect(screen.getByText(/Required to use the service; recorded here for reference and cannot be withdrawn/)).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: 'Withdraw consent' })).toHaveLength(0);
  });
});
