import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { AssignmentCompletionPage } from './assignment-completion-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/assignments/complete-assignment/confirm',
  useSearchParams: () => new URLSearchParams(),
}));

const me = { id: 'requester-1', name: 'Ada', firstName: 'Ada', lastName: 'Obi', phone: null, phoneVerified: true, status: 'ACTIVE', startMode: 'REQUESTER' } as unknown as Me;
const completed = {
  id: 'complete-assignment', errandId: 'errand-1', role: 'REQUESTER', status: 'COMPLETED',
  errand: { id: 'errand-1', title: 'Delivered errand', status: 'COMPLETED', autoCompleteAt: null },
};
const myRating = { id: 'r1', assignmentId: 'complete-assignment', direction: 'REQUESTER_TO_RUNNER', scores: { overall: 5 }, review: null, status: 'PUBLISHED', revealed: false, editable: true, editableUntil: '2099-01-01T00:00:00Z', createdAt: '2026-10-01T00:00:00Z' };

function renderCompleted(ratings: unknown) {
  server.use(
    http.get('*/api/v1/assignments/complete-assignment', () => envelope(completed)),
    http.get('*/api/v1/assignments/complete-assignment/ratings', () => envelope(ratings)),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><SessionProvider me={me}><AssignmentCompletionPage assignmentId="complete-assignment" /></SessionProvider></QueryClientProvider>);
}

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-completion' });

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('assignment completion', () => {
  it('offers to rate when nobody has rated yet', async () => {
    renderCompleted({ canRate: true, reason: null, windowEndsAt: '2099-01-01T00:00:00Z', mine: null, theirs: null, counterpartRated: false });

    expect(await screen.findByText('This errand has been completed.')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Rate this errand' })).toHaveAttribute('href', '/assignments/complete-assignment/rating');
    expect(screen.queryByText(/becomes available after/)).not.toBeInTheDocument();
  });

  it('does not ask to rate again once you have rated: it offers to edit or view the rating instead', async () => {
    renderCompleted({ canRate: false, reason: 'ALREADY_RATED', windowEndsAt: '2099-01-01T00:00:00Z', mine: myRating, theirs: null, counterpartRated: false });

    expect(await screen.findByRole('link', { name: 'Edit your rating' })).toHaveAttribute('href', '/assignments/complete-assignment/rating');
    expect(screen.queryByRole('link', { name: 'Rate this errand' })).not.toBeInTheDocument();
    cleanup();

    renderCompleted({ canRate: false, reason: 'ALREADY_RATED', windowEndsAt: '2099-01-01T00:00:00Z', mine: { ...myRating, revealed: true, editable: false }, theirs: null, counterpartRated: true });
    expect(await screen.findByRole('link', { name: 'View your rating' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Rate this errand' })).not.toBeInTheDocument();
  });

  it('offers nothing once the rating window has closed without a rating', async () => {
    renderCompleted({ canRate: false, reason: 'WINDOW_CLOSED', windowEndsAt: '2020-01-01T00:00:00Z', mine: null, theirs: null, counterpartRated: false });

    expect(await screen.findByText('This errand has been completed.')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('link', { name: /rating|Rate/ })).not.toBeInTheDocument();
  });

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
