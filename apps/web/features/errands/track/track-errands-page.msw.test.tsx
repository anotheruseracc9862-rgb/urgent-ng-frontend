import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { TrackErrandsPage } from './track-errands-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/track',
}));

const me = { id: 'requester-1', name: 'Ada', firstName: 'Ada', startMode: 'REQUESTER' } as unknown as Me;
const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-track' });

const base = {
  category: { id: 'c1', key: 'delivery', name: 'Delivery' },
  priority: 'STANDARD', timeMode: 'ASAP', scheduledAt: null, suggestedBudgetMinor: 300_000,
  pickupArea: 'Balogun', destinationArea: 'Lekki Phase 1', offerCount: 2,
  publishedAt: '2026-10-15T08:00:00.000Z', expiresAt: null,
  createdAt: '2026-10-15T08:00:00.000Z', updatedAt: '2026-10-15T09:00:00.000Z',
  lowestOfferMinor: null, offerPreview: [], attention: null, attentionExpiresAt: null,
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SessionProvider me={me}><TrackErrandsPage /></SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());

describe('Track your errands', () => {
  it('lists errands that have a runner with the tracker, message and safety actions', async () => {
    server.use(http.get('*/errands/mine', () => envelope([
      {
        ...base, id: 'e1', title: 'Collect fabric samples', status: 'IN_PROGRESS',
        runner: { firstName: 'Tunde', lastName: 'Okon', photoMediaId: null, rating: 4.9, ratingCount: 30, completedErrands: 52 },
        agreedAmountMinor: 300_000, assignmentId: 'a1', conversationId: 'c-9',
      },
      {
        ...base, id: 'e2', title: 'Inhaler run', status: 'DELIVERED',
        runner: { firstName: 'Fatima', lastName: 'Garba', photoMediaId: null, rating: 4.9, ratingCount: 30, completedErrands: 41 },
        agreedAmountMinor: 350_000, assignmentId: 'a2', conversationId: null,
      },
    ])));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Track your errands' })).toBeInTheDocument();
    expect((await screen.findAllByRole('link', { name: 'Live tracker' }))[0]).toHaveAttribute('href', '/assignments/a1/track');
    expect(screen.getByRole('link', { name: 'Message Tunde' })).toHaveAttribute('href', '/messages/c-9');
    expect(screen.getAllByRole('link', { name: 'Share with trusted contact' })[0]).toHaveAttribute('href', '/errands/e1/share');
    expect(screen.getAllByRole('link', { name: 'Cancel' })[0]).toHaveAttribute('href', '/assignments/a1/cancel');
    expect(screen.getByRole('link', { name: 'Confirm delivery' })).toHaveAttribute('href', '/assignments/a2/confirm');
    expect(screen.getByText('On the way to pickup')).toBeInTheDocument();
  });

  it('offers only the actions the stage allows: after pickup there is no cancel or change, only a dispute', async () => {
    server.use(http.get('*/errands/mine', () => envelope([
      {
        ...base, id: 'e3', title: 'Parcel', status: 'PICKED_UP',
        runner: { firstName: 'Tunde', lastName: 'Okon', photoMediaId: null, rating: 4.9, ratingCount: 30, completedErrands: 52 },
        agreedAmountMinor: 300_000, assignmentId: 'a3', conversationId: null,
      },
    ])));

    renderPage();

    expect(await screen.findByRole('link', { name: 'Live tracker' })).toHaveAttribute('href', '/assignments/a3/track');
    expect(screen.getByRole('link', { name: 'Open a dispute' })).toHaveAttribute('href', '/assignments/a3/dispute');
    expect(screen.getByRole('link', { name: 'Payment plan' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Change request' })).not.toBeInTheDocument();
  });

  it('a delivered errand is for confirming: no cancel, no change request', async () => {
    server.use(http.get('*/errands/mine', () => envelope([
      {
        ...base, id: 'e4', title: 'Parcel', status: 'DELIVERED',
        runner: { firstName: 'Tunde', lastName: 'Okon', photoMediaId: null, rating: 4.9, ratingCount: 30, completedErrands: 52 },
        agreedAmountMinor: 300_000, assignmentId: 'a4', conversationId: null,
      },
    ])));

    renderPage();

    expect(await screen.findByRole('link', { name: 'Confirm delivery' })).toHaveAttribute('href', '/assignments/a4/confirm');
    expect(screen.queryByRole('link', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Change request' })).not.toBeInTheDocument();
  });

  it('says what to do when nothing is in progress', async () => {
    server.use(http.get('*/errands/mine', () => envelope([])));
    renderPage();
    expect(await screen.findByText('No errands in progress')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My errands' })).toHaveAttribute('href', '/errands');
  });
});
