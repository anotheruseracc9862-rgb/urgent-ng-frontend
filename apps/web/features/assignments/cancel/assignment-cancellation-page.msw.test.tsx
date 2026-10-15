import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { AssignmentCancellationPage } from './assignment-cancellation-page';

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-cancel' });

function renderPage(role: 'REQUESTER' | 'RUNNER', status: string, errandStatus: string) {
  server.use(http.get('*/api/v1/assignments/cancel-assignment', () => envelope({
    id: 'cancel-assignment',
    errandId: 'errand-1',
    offerId: 'offer-1',
    requesterId: 'requester-1',
    runnerId: 'runner-1',
    status,
    agreedAmountMinor: 50000,
    currency: 'NGN',
    selectedAt: '2026-01-01T09:00:00.000Z',
    acceptanceDeadline: '2026-01-01T09:30:00.000Z',
    version: 1,
    role,
    errand: { id: 'errand-1', title: 'Cancellation errand', status: errandStatus },
  })));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AssignmentCancellationPage assignmentId="cancel-assignment" /></QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('assignment cancellation screen', () => {
  it('routes a runner with a pending selection to the decline flow', async () => {
    renderPage('RUNNER', 'PENDING_ACCEPTANCE', 'RUNNER_SELECTED');
    expect(await screen.findByText('You have not accepted this assignment. Decline it instead of cancelling.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Decline assignment' })).toHaveAttribute('href', '/assignments/cancel-assignment');
    expect(screen.queryByRole('button', { name: 'Cancel assignment' })).not.toBeInTheDocument();
  });

  it('routes a delivered errand to completion or dispute rather than plain cancellation', async () => {
    renderPage('REQUESTER', 'ACCEPTED', 'DELIVERED');
    expect(await screen.findByText('The item was delivered. Confirm completion or open a dispute instead of cancelling.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Confirm completion' })).toHaveAttribute('href', '/assignments/cancel-assignment/confirm');
    expect(screen.getByRole('link', { name: 'Open a dispute' })).toHaveAttribute('href', '/assignments/cancel-assignment/dispute');
    expect(screen.queryByRole('button', { name: 'Cancel assignment' })).not.toBeInTheDocument();
  });
});
