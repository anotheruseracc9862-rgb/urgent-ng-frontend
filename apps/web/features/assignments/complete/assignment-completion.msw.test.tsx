import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { AssignmentCompletionPage } from './assignment-completion-page';

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-completion' });

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('assignment completion', () => {
  it('shows that automatic completion is paused when the server deadline is null after delivery', async () => {
    server.use(http.get('*/api/v1/assignments/complete-assignment', () => envelope({
      id: 'complete-assignment',
      errandId: 'errand-1',
      offerId: 'offer-1',
      requesterId: 'requester-1',
      runnerId: 'runner-1',
      status: 'ACCEPTED',
      agreedAmountMinor: 550000,
      currency: 'NGN',
      selectedAt: '2026-12-31T22:00:00.000Z',
      acceptanceDeadline: '2026-12-31T22:30:00.000Z',
      version: 1,
      role: 'REQUESTER',
      errand: { id: 'errand-1', title: 'Delivered errand', status: 'DELIVERED', autoCompleteAt: null },
    })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AssignmentCompletionPage assignmentId="complete-assignment" /></QueryClientProvider>);

    expect(await screen.findByText('Automatic completion is paused while an open report or dispute is being handled.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm completion' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Something is wrong' })).toHaveAttribute('href', '/assignments/complete-assignment/dispute');
  });
});
