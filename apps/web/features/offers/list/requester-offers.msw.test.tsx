import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { RequesterOffersPage, requesterGroup } from './requester-offers-page';

const envelope = (data: unknown, meta: Record<string, unknown> = {}) => HttpResponse.json({ data, meta, requestId: 'req-requester-offers' });

const offer = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1', errandId: 'e1', status: 'ACTIVE', awaitingParty: 'REQUESTER', amountMinor: 450000, durationMinutes: 90,
  needsReconfirmation: false, version: 1, closeReason: null, errandTitle: 'Collect a parcel', errandStatus: 'OPEN',
  categoryFlow: 'TRANSIT', runnerFirstName: 'Tunde', runnerRating: 4.6, runnerCompletedErrands: 12, createdAt: '2026-10-22T09:00:00.000Z',
  ...overrides,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><RequesterOffersPage /></QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());

describe('requesterGroup', () => {
  it('sorts an offer by whose move it is', () => {
    expect(requesterGroup({ status: 'ACTIVE', awaitingParty: 'REQUESTER' })).toBe('Waiting for you');
    expect(requesterGroup({ status: 'ACTIVE', awaitingParty: 'RUNNER' })).toBe('Waiting for the runner');
    expect(requesterGroup({ status: 'ACTIVE', awaitingParty: 'NONE' })).toBe('Agreed');
    expect(requesterGroup({ status: 'SELECTED', awaitingParty: 'NONE' })).toBe('Selected');
    expect(requesterGroup({ status: 'REJECTED', awaitingParty: 'NONE' })).toBe('Closed');
  });
});

describe('the requester offers page', () => {
  it('lists offers across errands, the ones waiting for the requester first, each linking to the offer', async () => {
    server.use(http.get('*/api/v1/requester/offers', () => envelope([
      offer(),
      offer({ id: 'o2', errandId: 'e2', errandTitle: 'Deep clean my flat', categoryFlow: 'SERVICE', awaitingParty: 'RUNNER', runnerFirstName: 'Ada', runnerRating: null, runnerCompletedErrands: 1 }),
      offer({ id: 'o3', errandId: 'e3', errandTitle: 'Old errand', status: 'REJECTED', awaitingParty: 'NONE', closeReason: 'REQUESTER_REJECTED' }),
    ])));
    renderPage();

    expect(await screen.findByText('1 offer is waiting for you')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(headings.indexOf('Waiting for you · 1')).toBeLessThan(headings.indexOf('Waiting for the runner · 1'));

    const yours = screen.getByRole('link', { name: /Review offer: Collect a parcel, offer from Tunde/ });
    expect(yours).toHaveAttribute('href', '/offers/o1');
    expect(within(yours).getByText('₦4,500')).toBeInTheDocument();
    expect(within(yours).getByText('New offer · Your move')).toBeInTheDocument();
    expect(within(yours).getByText('4.6')).toBeInTheDocument();
    expect(within(yours).getByText(/12 errands done/)).toBeInTheDocument();

    const service = screen.getByRole('link', { name: /View offer: Deep clean my flat, offer from Ada/ });
    expect(within(service).getByText('No rating yet')).toBeInTheDocument();
    expect(within(service).getByText(/1 job done/)).toBeInTheDocument();
    expect(within(service).getByText('Counter sent · Runner’s move')).toBeInTheDocument();
    expect(screen.getByText('Closed: Requester Rejected')).toBeInTheDocument();
  });

  it('sends the chosen status to the API and says when there is nothing', async () => {
    const user = userEvent.setup();
    const seen: Array<string | null> = [];
    server.use(http.get('*/api/v1/requester/offers', ({ request }) => {
      seen.push(new URL(request.url).searchParams.get('status'));
      return envelope([]);
    }));
    renderPage();

    expect(await screen.findByText('No offers yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my errands' })).toHaveAttribute('href', '/errands');
    await user.click(screen.getByRole('tab', { name: 'Rejected' }));
    await waitFor(() => expect(seen).toContain('REJECTED'));
    expect(await screen.findByText('No offers in this status')).toBeInTheDocument();
  });

  it('keeps a selected offer pointing at the errand, where the assignment is', async () => {
    server.use(http.get('*/api/v1/requester/offers', () => envelope([offer({ status: 'SELECTED', awaitingParty: 'NONE' })])));
    renderPage();
    expect(await screen.findByRole('link', { name: /View errand: Collect a parcel/ })).toHaveAttribute('href', '/errands/e1');
  });

  it('offers a retry when the list cannot load', async () => {
    server.use(http.get('*/api/v1/requester/offers', () => HttpResponse.json({ error: { code: 'INTERNAL', message: 'x' }, requestId: 'r' }, { status: 500 })));
    renderPage();
    expect(await screen.findByText('We could not load your offers.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });
});
