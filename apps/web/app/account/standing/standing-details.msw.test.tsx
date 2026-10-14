import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { StandingDetails } from './standing-details';

const me: Me = {
  id: 'user-standing-1',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+2348031234567',
  phoneVerified: true,
  email: null,
  emailVerified: false,
  hasPassword: true,
  googleLinked: false,
  status: 'SUSPENDED',
  startMode: 'RUNNER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2025-03-10T00:00:00.000Z',
};

const enforcementAction = {
  id: 'action-standing-1',
  type: 'FEATURE_RESTRICTION',
  status: 'ACTIVE',
  reason: 'Offering is paused while identity evidence is reviewed.',
  startsAt: '2026-02-01T12:00:00.000Z',
  endsAt: '2026-02-10T12:00:00.000Z',
  canAppeal: true,
  appeal: { requestedAt: null, dueAt: null, outcome: null, decidedAt: null },
};
const reliability = {
  windowDays: 30,
  points: 4,
  thresholds: { warning: 3, restriction: 6, suspension: 9, adminReview: 12 },
  reached: 'WARNING',
  events: [{
    id: 'event-standing-1',
    type: 'ASSIGNMENT_CANCELLED',
    points: 4,
    occurredAt: '2026-02-01T12:00:00.000Z',
    errandId: 'errand-1',
    assignmentId: 'assignment-1',
    source: 'USER',
  }],
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-standing' });

function renderDetails() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>
        <StandingDetails />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe('account standing details', () => {
  it('shows suspension reasons and allows a single appeal with reliability events', async () => {
    const user = userEvent.setup();
    let appealNote: string | undefined;
    server.use(
      http.get('*/api/v1/me/enforcement', () => envelope([enforcementAction])),
      http.get('*/api/v1/me/reliability', () => envelope(reliability)),
      http.post('*/api/v1/enforcement/action-standing-1/appeal', async ({ request }) => {
        appealNote = (await request.json() as { note: string }).note;
        return HttpResponse.json({
          data: { ...enforcementAction, canAppeal: false, appeal: { ...enforcementAction.appeal, requestedAt: '2026-02-02T12:00:00.000Z', dueAt: '2026-02-09T12:00:00.000Z' } },
          meta: {},
          requestId: 'req-appeal',
        }, { status: 201 });
      }),
    );

    renderDetails();

    expect(await screen.findByText(enforcementAction.reason)).toBeInTheDocument();
    expect(screen.getByText(/assignment cancelled/)).toBeInTheDocument();
    expect(screen.getByText(/Thresholds: warning 3, restriction 6/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Appeal explanation'), 'I have provided the requested evidence.');
    await user.click(screen.getByRole('button', { name: 'Submit appeal' }));

    await waitFor(() => expect(appealNote).toBe('I have provided the requested evidence.'));
  });
});
