import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { AssignmentProblemsPage } from './assignment-problems-page';

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-problems' });

function assignment(categoryKey: string) {
  return {
    id: 'assignment-problems',
    errandId: 'errand-problems',
    offerId: 'offer-problems',
    requesterId: 'requester-1',
    runnerId: 'runner-1',
    status: 'ACCEPTED',
    agreedAmountMinor: 550000,
    currency: 'NGN',
    selectedAt: '2026-01-01T09:00:00.000Z',
    acceptanceDeadline: '2026-01-01T09:30:00.000Z',
    version: 2,
    role: 'RUNNER',
    errand: { id: 'errand-problems', status: 'IN_PROGRESS', accessLevel: 'EXACT', title: 'Errand', category: { key: categoryKey } },
  };
}

function renderPage(categoryKey = 'SHOPPING_PURCHASE') {
  server.use(
    http.get('*/api/v1/assignments/assignment-problems', () => envelope(assignment(categoryKey))),
    http.get('*/api/v1/assignments/assignment-problems/problems', () => envelope([])),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><AssignmentProblemsPage assignmentId="assignment-problems" /></QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('assignment problem and delay controls', () => {
  it('shows the server limit message when a fourth delay notice is refused and offers receipts for shopping errands', async () => {
    let sent = 0;
    server.use(http.post('*/api/v1/assignments/assignment-problems/delay-notices', () => {
      sent += 1;
      if (sent > 3) {
        return HttpResponse.json({
          error: { code: 'ASSIGNMENT_INVALID_STATE', message: 'You have used all the delay notices for this errand.' },
          requestId: 'req-delay-limit',
        }, { status: 409 });
      }
      return envelope({ id: `delay-${sent}`, type: 'DELAY_NOTICE', createdAt: new Date().toISOString() });
    }));
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Add a purchase receipt' })).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Send delay notice' });
    for (let i = 0; i < 4; i += 1) {
      await user.click(send);
      if (i < 3) await screen.findByText('Delay notice sent.');
    }
    expect(await screen.findByText('You have used all the delay notices for this errand.')).toBeInTheDocument();
    expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();
  });

  it('does not offer a receipt for a non-shopping errand', async () => {
    renderPage('DELIVERY');
    await screen.findByRole('heading', { name: 'Reported problems' });
    expect(screen.queryByRole('heading', { name: 'Add a purchase receipt' })).not.toBeInTheDocument();
  });
});
