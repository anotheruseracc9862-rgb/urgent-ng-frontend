import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Errand } from '../api';
import { listen, server } from '@/test/msw/server';
import { ErrandPublishedPage } from './errand-published-page';

const errandId = 'errand-published-1';
const publishedErrand: Errand = {
  id: errandId,
  version: 2,
  status: 'OPEN',
  category: { id: 'category-1', key: 'delivery', name: 'Delivery' },
  priority: 'STANDARD',
  title: 'Deliver a package',
  description: 'Collect and deliver one package.',
  instructions: null,
  timeMode: 'ASAP',
  scheduledAt: null,
  suggestedBudgetMinor: 500000,
  itemSize: 'SMALL',
  itemValueMinor: null,
  pickup: null,
  destination: null,
  pickupContact: null,
  dropoffContact: null,
  photos: [],
  assignment: null,
  publishedAt: '2026-10-13T10:05:00.000Z',
  expiresAt: '2026-10-14T10:05:00.000Z',
  autoCompleteAt: null,
  cancelledAt: null,
  cancellationReason: null,
  offerCount: 0,
  extended: false,
  createdAt: '2026-10-13T10:00:00.000Z',
  updatedAt: '2026-10-13T10:05:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-published' });

function renderPublished() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ErrandPublishedPage errandId={errandId} />
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe('published errand page', () => {
  it('offers view, boost, and share actions without putting private location data in the shared URL', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    server.use(http.get(`*/api/v1/errands/${errandId}`, () => envelope(publishedErrand)));

    renderPublished();

    expect(await screen.findByRole('heading', { name: 'Your errand is live' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'View errand' })).toHaveAttribute('href', `/errands/${errandId}`);
    expect(screen.getByRole('link', { name: 'Boost · optional' })).toHaveAttribute('href', expect.stringMatching(/^\/boosts\?errandId=/));
    await user.click(screen.getByRole('button', { name: 'Copy errand link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/errands/${errandId}`));
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied.');
  });
});
