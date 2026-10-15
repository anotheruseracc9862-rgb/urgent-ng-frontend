import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { VerificationPage } from '@/features/verification/verification-page';
import { RunnerProfilePage } from './runner-profile-page';
import { MarketplaceFeedPage } from '@/features/marketplace/feed/marketplace-feed-page';
import { SubmitOfferPage } from '@/features/offers/submit/submit-offer-page';
import { AssignmentPendingPage } from '@/features/offers/assignment/assignment-pending-page';

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ ...navigation, refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock('@/lib/auth/client', () => ({
  useSession: () => ({ me: { id: 'runner-flow-1', firstName: 'Ada', lastName: 'Lovelace', phoneVerified: true } }),
}));
vi.mock('@/components/media-upload/media-upload', () => ({
  MediaUpload: ({ capture, onChange }: { capture?: string; onChange?: (ids: string[]) => void }) => (
    <button type="button" onClick={() => onChange?.([capture ? 'runner-flow-selfie' : 'runner-flow-id'])}>
      Upload {capture ? 'selfie' : 'ID'}
    </button>
  ),
}));
vi.mock('./runner-area-picker', () => ({
  RunnerAreaPicker: ({ onCenterChange }: { onCenterChange: (value: { lat: number; lng: number; source: 'MANUAL' }) => void }) => (
    <button type="button" onClick={() => onCenterChange({ lat: 6.5, lng: 3.4, source: 'MANUAL' })}>Choose test area</button>
  ),
}));

const envelope = (data: unknown, meta: Record<string, unknown> = {}) =>
  HttpResponse.json({ data, meta, requestId: 'req-runner-flow' });

function renderStage(client: QueryClient, children: React.ReactNode) {
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('F5 runner end-to-end flow', () => {
  it('verifies, sets an operating area, finds an errand, sends an offer, and accepts selection', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    let verified = false;
    let availability: 'AVAILABLE' | 'UNAVAILABLE' = 'UNAVAILABLE';
    let areaCenter = { lat: 6.5244, lng: 3.3792 };
    let offerSubmitted = false;
    let accepted = false;
    const profile = () => ({
      transport: 'WALKING',
      areaCenter,
      availability,
      excludedCategoryIds: [],
      areaRadiusKm: 5,
    });
    const errand = {
      id: 'runner-flow-errand',
      title: 'Collect medicine',
      category: { id: 'category-health', key: 'health', name: 'Health' },
      pickup: { area: 'Yaba' },
      destination: { area: 'Surulere' },
      distance: { label: '2–5 km', minKm: 2, maxKm: 5 },
      timeMode: 'ASAP',
      priority: 'STANDARD',
      scheduledAt: null,
      suggestedBudgetMinor: 500000,
      requester: { firstName: 'Mina', photoMediaId: null, rating: null, ratingCount: 0, badges: [] },
      instructions: 'Collect the sealed package.',
      itemSize: null,
      itemValueMinor: null,
      pickupApprox: null,
      destinationApprox: null,
      photos: [],
      description: 'Pick up a sealed package.',
      postedAt: '2026-01-01T10:00:00.000Z',
      expiresAt: '2026-01-02T10:00:00.000Z',
      offerCount: 0,
      boosted: false,
      saved: false,
    };
    const assignment = () => ({
      id: 'runner-flow-assignment',
      errandId: errand.id,
      offerId: 'runner-flow-offer',
      requesterId: 'requester-flow-1',
      runnerId: 'runner-flow-1',
      status: accepted ? 'ACCEPTED' : 'PENDING_ACCEPTANCE',
      agreedAmountMinor: 550000,
      currency: 'NGN',
      selectedAt: new Date().toISOString(),
      acceptanceDeadline: new Date(Date.now() + 60 * 60_000).toISOString(),
      acceptedAt: accepted ? new Date().toISOString() : null,
      declinedAt: null,
      timedOutAt: null,
      cancelledAt: null,
      completedAt: null,
      version: accepted ? 2 : 1,
      role: 'RUNNER',
      errand: { id: errand.id, status: accepted ? 'ACCEPTED' : 'RUNNER_SELECTED', title: errand.title },
    });

    server.use(
      http.get('*/api/v1/verification', () => envelope({
        status: verified ? 'VERIFIED' : 'NOT_STARTED',
        displayStatus: verified ? 'VERIFIED' : 'NOT_STARTED',
        expiresAt: null,
        latestAttempt: null,
        nextAttemptAt: null,
        verified,
        phoneVerified: true,
        attemptsRemaining: 3,
        feeRequired: false,
        canStart: !verified,
      })),
      http.post('*/api/v1/verification/attempts', async ({ request }) => {
        const body = await request.json() as { nin: string };
        expect(body.nin).not.toMatch(/(?:0000|1111)$/);
        verified = true;
        return envelope({
          id: 'runner-flow-verification',
          status: 'VERIFIED',
          displayStatus: 'VERIFIED',
          failureReason: null,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          expiresAt: null,
          attemptNumber: 1,
        });
      }),
      http.get('*/api/v1/runner/profile', () => envelope(profile())),
      http.put('*/api/v1/runner/profile', async ({ request }) => {
        const body = await request.json() as { areaCenter: { lat: number; lng: number } };
        areaCenter = body.areaCenter;
        return envelope(profile());
      }),
      http.put('*/api/v1/runner/availability', async ({ request }) => {
        const body = await request.json() as { availability: 'AVAILABLE' | 'UNAVAILABLE' };
        availability = body.availability;
        return envelope(profile());
      }),
      http.get('*/api/v1/runner/eligibility', () => {
        const canOffer = verified && availability === 'AVAILABLE';
        return envelope({
          reasons: canOffer ? [] : [verified ? 'UNAVAILABLE' : 'NOT_VERIFIED'],
          canOffer,
          canBrowseFeed: canOffer,
        });
      }),
      http.get('*/api/v1/reference/categories', () => envelope([{ id: 'category-health', key: 'health', name: 'Health' }])),
      http.get('*/api/v1/marketplace/errands', () => envelope([errand])),
      http.get('*/api/v1/marketplace/errands/runner-flow-errand', () => envelope(errand)),
      http.get('*/api/v1/runner/offer-limit', () => envelope({
        used: 0, limit: 10, remaining: 10, resetsAt: new Date(Date.now() + 86_400_000).toISOString(), isPro: false, isAtLimit: false,
      })),
      http.post('*/api/v1/errands/runner-flow-errand/offers', () => {
        offerSubmitted = true;
        return envelope({ id: 'runner-flow-offer' });
      }),
      http.get('*/api/v1/assignments/runner-flow-assignment', () => {
        if (!offerSubmitted) return HttpResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Not selected.' } }, { status: 404 });
        return HttpResponse.json({ data: assignment(), meta: {}, requestId: 'req-runner-assignment' }, {
          headers: { Date: new Date().toUTCString() },
        });
      }),
      http.post('*/api/v1/assignments/runner-flow-assignment/accept', () => {
        accepted = true;
        return envelope({ id: 'runner-flow-assignment', status: 'ACCEPTED' });
      }),
    );

    const verificationStage = renderStage(client, <VerificationPage />);
    await user.type(await screen.findByLabelText('Home address'), '7 Test Road');
    await user.type(screen.getByLabelText('Local government area'), 'Ikeja');
    await user.type(screen.getByLabelText('Date of birth'), '1990-01-01');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText('11-digit NIN'), '12345678901');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByRole('button', { name: 'Upload selfie' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Submit for verification' }));
    expect(await screen.findByText('You’re verified')).toBeInTheDocument();
    verificationStage.unmount();

    const profileStage = renderStage(client, <RunnerProfilePage />);
    await user.click(await screen.findByRole('button', { name: 'Choose test area' }));
    await user.click(screen.getByRole('button', { name: 'Save runner profile' }));
    expect(await screen.findByText('Runner profile saved.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Set available' }));
    await waitFor(() => expect(availability).toBe('AVAILABLE'));
    expect(areaCenter).toEqual({ lat: 6.5, lng: 3.4 });
    profileStage.unmount();

    const feedStage = renderStage(client, <MarketplaceFeedPage />);
    expect(await screen.findByRole('link', { name: 'Collect medicine' })).toHaveAttribute('href', '/marketplace/runner-flow-errand');
    feedStage.unmount();

    const offerStage = renderStage(client, <SubmitOfferPage errandId={errand.id} />);
    await user.type(await screen.findByLabelText(/Your price \(NGN\)/), '5500');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Send offer' }));
    await user.click(await screen.findByRole('button', { name: 'Continue to offer' }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith('/offers/runner-flow-offer'));
    expect(offerSubmitted).toBe(true);
    offerStage.unmount();

    renderStage(client, <AssignmentPendingPage assignmentId="runner-flow-assignment" />);
    expect(await screen.findByText('Your response is needed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept assignment' }));
    expect(await screen.findByText('Assignment accepted')).toBeInTheDocument();
    expect(accepted).toBe(true);
  });
});
