import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { ActiveTasksPage } from './active-tasks-page';

const me = { id: 'active-runner-1', name: 'Ada Lovelace', firstName: 'Ada', startMode: 'RUNNER' } as Me;
const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-active-tasks' });

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}><ActiveTasksPage /></SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('active runner tasks', () => {
  it('separates pending responses and in-progress work with task links', async () => {
    server.use(http.get('*/api/v1/runner/assignments', ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      return envelope(status === 'PENDING_ACCEPTANCE'
        ? [{
            id: 'pending-task-1',
            errandId: 'errand-pending-1',
            status: 'PENDING_ACCEPTANCE',
            errandStatus: 'RUNNER_SELECTED',
            errandTitle: 'Collect medicine',
            agreedAmountMinor: 550000,
            acceptanceDeadline: '2026-10-16T15:00:00.000Z',
            pickupArea: 'Yaba',
            destinationArea: 'Surulere',
            selectedAt: '2026-10-16T13:00:00.000Z',
            requesterFirstName: 'Mina',
            conversationId: null,
          }]
        : [{
            id: 'active-task-1',
            errandId: 'errand-active-1',
            status: 'ACCEPTED',
            errandStatus: 'IN_PROGRESS',
            errandTitle: 'Deliver a parcel',
            agreedAmountMinor: 700000,
            acceptanceDeadline: '2026-10-16T15:00:00.000Z',
            acceptedAt: '2026-10-16T13:30:00.000Z',
            pickupArea: 'Ikeja',
            destinationArea: 'Yaba',
            selectedAt: '2026-10-16T13:00:00.000Z',
            requesterFirstName: 'Mina',
            conversationId: null,
          }]);
    }));

    renderPage();

    const waiting = within(await screen.findByRole('region', { name: 'Waiting for your answer' }));
    expect(waiting.getByRole('link', { name: /Collect medicine/ })).toHaveAttribute('href', '/assignments/pending-task-1');
    expect(waiting.getByText('Respond')).toBeInTheDocument();

    const inProgress = within(screen.getByRole('region', { name: 'In progress' }));
    expect(inProgress.getByRole('link', { name: /Deliver a parcel/ })).toHaveAttribute('href', '/assignments/active-task-1');
    expect(inProgress.getByText('Open task')).toBeInTheDocument();
  });

  it('shows the browse-marketplace action when the runner has no active tasks', async () => {
    server.use(http.get('*/api/v1/runner/assignments', () => envelope([])));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'No active tasks right now' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find errands' })).toHaveAttribute('href', '/marketplace');
    expect(screen.getByRole('link', { name: 'Job history' })).toHaveAttribute('href', '/runner/history');
  });
});
