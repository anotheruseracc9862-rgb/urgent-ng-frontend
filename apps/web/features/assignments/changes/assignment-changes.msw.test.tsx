import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { AssignmentChangesPage } from './assignment-changes-page';

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-change' });

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('assignment change requests', () => {
  it('refreshes the agreement after accepting an amount change', async () => {
    let accepted = false;
    const pending = {
      id: 'change-1',
      assignmentId: 'change-assignment',
      requestedBy: 'runner-1',
      type: 'AMOUNT',
      payload: { amountMinor: 250000 },
      status: accepted ? 'ACCEPTED' : 'PENDING',
      respondedBy: null,
      respondedAt: null,
      expiresAt: '2026-12-31T23:59:59.000Z',
      createdAt: '2026-12-31T23:00:00.000Z',
    };
    server.use(
      http.get('*/api/v1/assignments/change-assignment', () => envelope({
        id: 'change-assignment',
        errandId: 'errand-1',
        offerId: 'offer-1',
        requesterId: 'requester-1',
        runnerId: 'runner-1',
        status: 'ACCEPTED',
        agreedAmountMinor: 100000,
        currency: 'NGN',
        selectedAt: '2026-12-31T22:00:00.000Z',
        acceptanceDeadline: '2026-12-31T22:30:00.000Z',
        version: 1,
        role: 'REQUESTER',
        errand: { id: 'errand-1', title: 'Fee change', status: 'IN_PROGRESS', timeMode: null, scheduledAt: null },
      })),
      http.get('*/api/v1/assignments/change-assignment/change-requests', () => envelope([{ ...pending, status: accepted ? 'ACCEPTED' : 'PENDING', respondedBy: accepted ? 'requester-1' : null }])),
      http.get('*/api/v1/assignments/change-assignment/payment-agreement', () => envelope({
        assignmentId: 'change-assignment',
        agreedAmountMinor: accepted ? 250000 : 100000,
        currency: 'NGN',
        paymentMethod: 'CASH',
        paymentTiming: 'AT_DELIVERY',
        confirmedByRequesterAt: null,
        confirmedByRunnerAt: null,
        fullyConfirmed: false,
      })),
      http.post('*/api/v1/change-requests/change-1/accept', ({ request }) => {
        expect(request.headers.get('Idempotency-Key')).toBeTruthy();
        accepted = true;
        return envelope({ ...pending, status: 'ACCEPTED', respondedBy: 'requester-1', respondedAt: new Date().toISOString() });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><AssignmentChangesPage assignmentId="change-assignment" /></QueryClientProvider>);
    const user = userEvent.setup();

    expect(await screen.findByText(/Agreed runner fee:/)).toHaveTextContent('₦1,000.00');
    await user.click(await screen.findByRole('button', { name: 'Accept change' }));
    expect(await screen.findByText(/Agreed runner fee:/)).toHaveTextContent('₦2,500.00');
  });
});
