import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Errand } from '../api';
import { listen, server } from '@/test/msw/server';
import { wasErrandJustPosted } from '../detail/errand-posted-banner';
import { ErrandReviewPage } from './errand-review-page';

const errandId = 'errand-review-1';
const category = { id: 'category-1', key: 'delivery', name: 'Delivery' };
const draft: Errand = {
  id: errandId,
  version: 1,
  status: 'DRAFT',
  category,
  priority: 'STANDARD',
  title: 'Deliver a package',
  description: 'Collect and deliver one package.',
  instructions: null,
  timeMode: 'ASAP',
  scheduledAt: null,
  suggestedBudgetMinor: 500000,
  itemSize: 'SMALL',
  itemValueMinor: null,
  pickup: {
    lga: 'Ikeja',
    state: 'Lagos',
    approx: { lat: 6.6, lng: 3.35 },
    exact: { lat: 6.601, lng: 3.351 },
    addressText: '12 Private Street',
    landmark: 'Near private landmark',
    area: 'Ikeja',
  },
  destination: {
    lga: 'Kosofe',
    state: 'Lagos',
    approx: { lat: 6.55, lng: 3.4 },
    exact: { lat: 6.551, lng: 3.401 },
    addressText: '8 Other Street',
    landmark: 'Near other landmark',
    area: 'Magodo',
  },
  pickupContact: { name: 'Private pickup contact', phone: '+2348031234567' },
  dropoffContact: { name: 'Private dropoff contact', phone: '+2348031234568' },
  photos: [],
  assignment: null,
  publishedAt: null,
  expiresAt: null,
  autoCompleteAt: null,
  cancelledAt: null,
  cancellationReason: null,
  offerCount: 0,
  extended: false,
  createdAt: '2026-10-13T10:00:00.000Z',
  updatedAt: '2026-10-13T10:00:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-review' });

function renderReview() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrandReviewPage errandId={errandId} />
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('errand review and publish', () => {
  it('keeps private address and contact data out of the review and publishes once on a double click', async () => {
    const user = userEvent.setup();
    const idempotencyKeys: string[] = [];
    let publishCount = 0;
    const published = { ...draft, status: 'OPEN' as const, version: 2, publishedAt: '2026-10-13T10:05:00.000Z' };
    server.use(
      // The server is the authority: after publishing, it answers with the published errand.
      http.get(`*/api/v1/errands/${errandId}`, () => envelope(publishCount > 0 ? published : draft)),
      http.post(`*/api/v1/errands/${errandId}/publish`, async ({ request }) => {
        publishCount += 1;
        idempotencyKeys.push(request.headers.get('Idempotency-Key') ?? '');
        expect(await request.json()).toEqual({ prohibitedItemsConfirmed: true });
        return envelope(published);
      }),
    );

    renderReview();
    expect(await screen.findByLabelText('I confirm this errand does not include prohibited items.')).toBeInTheDocument();
    expect(screen.getByText('Ikeja, Lagos')).toBeInTheDocument();
    expect(screen.queryByText('12 Private Street')).not.toBeInTheDocument();
    expect(screen.queryByText('+2348031234567')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('I confirm this errand does not include prohibited items.'));
    await user.dblClick(screen.getByRole('button', { name: 'Post errand' }));

    await waitFor(() => expect(publishCount).toBe(1));
    expect(idempotencyKeys).toHaveLength(1);
    expect(idempotencyKeys[0]).toMatch(/^[0-9a-f-]{36}$/i);
    // Posting goes straight to the errand, which shows its one-time confirmation.
    await waitFor(() => expect(wasErrandJustPosted(errandId)).toBe(true));
  });

  it('names fields the backend reports as incomplete without showing the request ID', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope(draft)),
      http.post(`*/api/v1/errands/${errandId}/publish`, () => HttpResponse.json({
        error: {
          code: 'ERRAND_NOT_ELIGIBLE',
          message: 'This errand is not complete yet.',
          details: { reason: 'INCOMPLETE', problems: [{ field: 'destination', code: 'REQUIRED' }] },
        },
        requestId: 'req-incomplete',
      }, { status: 422 })),
    );

    renderReview();
    await screen.findByLabelText('I confirm this errand does not include prohibited items.');
    await user.click(screen.getByLabelText('I confirm this errand does not include prohibited items.'));
    await user.click(screen.getByRole('button', { name: 'Post errand' }));

    expect(await screen.findByRole('link', { name: 'Drop-off location' })).toHaveAttribute(
      'href',
      `/errands/${errandId}/edit#errand-destination`,
    );
    expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();
  });

  it('maps a backend schedule rejection back to the schedule field', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope({
        ...draft,
        timeMode: 'SCHEDULED',
        scheduledAt: '2026-10-14T10:00:00.000Z',
      })),
      http.post(`*/api/v1/errands/${errandId}/publish`, () => HttpResponse.json({
        error: { code: 'SCHEDULE_OUT_OF_RANGE', message: 'Schedule not allowed.' },
        requestId: 'req-schedule',
      }, { status: 422 })),
    );

    renderReview();
    await screen.findByLabelText('I confirm this errand does not include prohibited items.');
    await user.click(screen.getByLabelText('I confirm this errand does not include prohibited items.'));
    await user.click(screen.getByRole('button', { name: 'Post errand' }));

    expect(await screen.findByRole('link', { name: 'Change the scheduled time' })).toHaveAttribute(
      'href',
      `/errands/${errandId}/edit#errand-schedule`,
    );
    expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();
  });

  it('reuses the same idempotency key when retrying a failed request', async () => {
    const user = userEvent.setup();
    const idempotencyKeys: string[] = [];
    let publishCount = 0;
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope(draft)),
      http.post(`*/api/v1/errands/${errandId}/publish`, ({ request }) => {
        publishCount += 1;
        idempotencyKeys.push(request.headers.get('Idempotency-Key') ?? '');
        if (publishCount === 1) {
          return HttpResponse.json({
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Temporarily unavailable.' },
            requestId: 'req-retry',
          }, { status: 503 });
        }
        return envelope({ ...draft, status: 'OPEN', version: 2 });
      }),
    );

    renderReview();
    await screen.findByLabelText('I confirm this errand does not include prohibited items.');
    await user.click(screen.getByLabelText('I confirm this errand does not include prohibited items.'));
    await user.click(screen.getByRole('button', { name: 'Post errand' }));
    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(publishCount).toBe(2));
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
  });
});
