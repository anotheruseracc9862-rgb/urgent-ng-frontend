import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { NoShowPage } from './no-show-page';

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-no-show' });

function renderPage(noShow: Record<string, unknown>) {
  server.use(
    http.get('*/api/v1/assignments/no-show-1', () => envelope({
      id: 'no-show-1',
      errandId: 'errand-1',
      offerId: 'offer-1',
      requesterId: 'requester-1',
      runnerId: 'runner-1',
      status: 'ACCEPTED',
      agreedAmountMinor: 50000,
      currency: 'NGN',
      selectedAt: '2026-01-01T09:00:00.000Z',
      acceptanceDeadline: '2026-01-01T09:30:00.000Z',
      version: 1,
      role: 'REQUESTER',
      errand: { id: 'errand-1', title: 'No-show errand', status: 'IN_PROGRESS' },
    })),
    http.get('*/api/v1/assignments/no-show-1/no-show', () => envelope({
      report: null,
      canReport: false,
      earliestReportAt: '2027-01-01T10:30:00.000Z',
      ...noShow,
    })),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><NoShowPage assignmentId="no-show-1" /></QueryClientProvider>);
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('no-show workflow', () => {
  it('shows the earliest allowed time when reporting is not available yet', async () => {
    renderPage({});
    expect(await screen.findByText(/You can report a no-show starting at/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Report no-show' })).not.toBeInTheDocument();
  });

  it('shows a no-response report as settled after the response deadline', async () => {
    renderPage({
      report: {
        id: 'no-show-report',
        assignmentId: 'no-show-1',
        status: 'CONFIRMED',
        reportedByMe: true,
        note: null,
        responseDueAt: '2026-01-01T10:00:00.000Z',
        respondedAt: null,
        resolvedAt: '2026-01-01T10:15:00.000Z',
        resolutionSource: 'NO_RESPONSE',
        createdAt: '2026-01-01T09:45:00.000Z',
      },
      earliestReportAt: null,
    });
    expect(await screen.findByText('This no-show report is settled as confirmed.')).toBeInTheDocument();
    expect(screen.getByText('Settled after no response before the deadline.')).toBeInTheDocument();
  });
});
