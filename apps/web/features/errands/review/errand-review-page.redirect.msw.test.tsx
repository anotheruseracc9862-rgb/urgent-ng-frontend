import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import type { Errand } from '../api';
import { ErrandReviewPage } from './errand-review-page';

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/errands/errand-1/review',
  useSearchParams: () => new URLSearchParams(),
}));

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-review' });
const errandOf = (status: string) => ({
  id: 'errand-1', version: 3, status, category: { id: 'c1', key: 'pickup', name: 'Pickup', flow: 'TRANSIT' }, priority: 'STANDARD',
  title: 'Laundry', description: 'Wash and iron', instructions: null, timeMode: 'ASAP', scheduledAt: null, suggestedBudgetMinor: 500000,
  itemSize: null, itemValueMinor: null, pickup: null, destination: null, pickupContact: null, dropoffContact: null, photos: [], assignment: null,
  publishedAt: null, expiresAt: null, autoCompleteAt: null, cancelledAt: null, cancellationReason: null, offerCount: 0, extended: false,
  createdAt: '2026-10-13T10:00:00.000Z', updatedAt: '2026-10-13T10:00:00.000Z',
}) as unknown as Errand;

function renderReview() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ErrandReviewPage errandId="errand-1" /></QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); nav.replace.mockClear(); });
afterAll(() => server.close());

describe('the review page for an errand that is not a draft', () => {
  it.each(['OPEN', 'RUNNER_SELECTED', 'ACCEPTED', 'COMPLETED', 'CANCELLED'])('sends a %s errand to its own page instead of showing a review', async (status) => {
    server.use(http.get('*/api/v1/errands/errand-1', () => envelope(errandOf(status))));
    renderReview();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/errands/errand-1'));
    expect(screen.queryByText(/already posted/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post errand' })).not.toBeInTheDocument();
  });

  it('shows the review for a draft and stays put', async () => {
    server.use(http.get('*/api/v1/errands/errand-1', () => envelope(errandOf('DRAFT'))));
    renderReview();
    expect(await screen.findByRole('button', { name: 'Post errand' })).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
