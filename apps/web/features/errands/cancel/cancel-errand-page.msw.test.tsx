import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { components } from '@urgent/api-client';
import { listen, server } from '@/test/msw/server';
import { CancelErrandPage } from './cancel-errand-page';

type Errand = components['schemas']['ErrandDto'];

const errandId = 'errand-cancel-1';
const openErrand: Errand = {
  id: errandId,
  version: 3,
  status: 'OPEN',
  category: { id: 'category-1', key: 'delivery', name: 'Delivery' },
  title: 'Deliver a package',
  description: 'Collect and deliver a package.',
  instructions: null,
  priority: 'STANDARD',
  timeMode: 'ASAP',
  scheduledAt: null,
  suggestedBudgetMinor: 400000,
  itemSize: null,
  itemValueMinor: null,
  pickup: {
    area: 'Ikeja',
    lga: 'Ikeja',
    state: 'Lagos',
    approx: { lat: 6.6, lng: 3.35 },
    exact: { lat: 6.6, lng: 3.35 },
    addressText: '12 Private Street',
    landmark: null,
  },
  destination: null,
  pickupContact: null,
  dropoffContact: null,
  photos: [],
  assignment: null,
  offerCount: 2,
  publishedAt: '2026-10-14T10:00:00.000Z',
  expiresAt: '2026-10-15T10:00:00.000Z',
  autoCompleteAt: null,
  extended: false,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-10-14T09:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-cancel' });

function renderCancel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CancelErrandPage errandId={errandId} />
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('cancel errand page', () => {
  it('shows the open-stage consequence and submits a valid requester reason', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope(openErrand)),
      http.post(`*/api/v1/errands/${errandId}/cancel`, async ({ request }) => {
        body = await request.json();
        return envelope({ ...openErrand, status: 'CANCELLED', cancellationReason: 'SAFETY_CONCERN' });
      }),
    );

    renderCancel();
    expect(await screen.findByText('The errand and its offers will close. No runner has been selected.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Reason'), 'SAFETY_CONCERN');
    await user.type(screen.getByLabelText(/Note/), 'The pickup location changed unexpectedly.');
    await user.click(screen.getByRole('button', { name: 'Cancel errand' }));

    await waitFor(() => expect(body).toEqual({
      reason: 'SAFETY_CONCERN',
      note: 'The pickup location changed unexpectedly.',
    }));
  });

  it('does not offer plain cancellation after pickup', async () => {
    const assignmentId = 'assignment-picked-up';
    server.use(
      http.get(`*/api/v1/errands/${errandId}`, () => envelope({
        ...openErrand,
        status: 'PICKED_UP',
        assignment: {
          id: assignmentId,
          runnerId: 'runner-1',
          status: 'ACCEPTED',
          agreedAmountMinor: 400000,
          acceptedAt: '2026-10-14T10:10:00.000Z',
        },
      })),
    );

    renderCancel();

    expect(await screen.findByText('Cancellation is not available after pickup. Open a dispute if something is wrong.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel errand' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open assignment hub' })).toHaveAttribute('href', `/assignments/${assignmentId}`);
  });

  it.each([
    ['RUNNER_SELECTED', true, 'The selected runner will be notified.'],
    ['ACCEPTED', true, 'The accepted runner will be notified'],
    ['IN_PROGRESS', true, 'This is recorded as a late cancellation'],
    ['DELIVERED', false, 'Cancellation is not available after delivery.'],
  ] as const)('applies the backend cancellation rule for %s', async (status, canCancel, consequenceText) => {
    server.use(http.get(`*/api/v1/errands/${errandId}`, () => envelope({
      ...openErrand,
      status,
      assignment: status === 'RUNNER_SELECTED' || status === 'ACCEPTED' || status === 'IN_PROGRESS' || status === 'DELIVERED'
        ? {
            id: 'assignment-stage',
            runnerId: 'runner-1',
            status: status === 'RUNNER_SELECTED' ? 'PENDING_ACCEPTANCE' : 'ACCEPTED',
            agreedAmountMinor: 400000,
            acceptedAt: status === 'RUNNER_SELECTED' ? null : '2026-10-14T10:10:00.000Z',
          }
        : null,
    })));

    renderCancel();

    expect(await screen.findByText(new RegExp(consequenceText))).toBeInTheDocument();
    if (canCancel) {
      expect(screen.getByRole('button', { name: 'Cancel errand' })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole('button', { name: 'Cancel errand' })).not.toBeInTheDocument();
    }
  });
});
