import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { PublicProfilePage } from './public-profile-page';

const me: Me = {
  id: 'viewer-profile-1',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+2348031234567',
  phoneVerified: true,
  email: null,
  emailVerified: false,
  hasPassword: true,
  googleLinked: false,
  status: 'ACTIVE',
  startMode: 'RUNNER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2025-03-10T00:00:00.000Z',
};

const profile = {
  id: 'public-profile-1',
  firstName: 'Tunde',
  lastInitial: 'O',
  photoMediaId: null,
  bio: 'Careful and quick.',
  memberSince: '2025-03-10T00:00:00.000Z',
  badges: ['TRUSTED', 'VERIFIED_RUNNER'],
  stats: {
    completedAsRunner: 52,
    completedAsRequester: 4,
    runnerRating: { average: null, count: 2 },
    requesterRating: { average: 4.9, count: 8 },
  },
};
const envelope = (data: unknown, meta: Record<string, unknown> = {}) =>
  HttpResponse.json({ data, meta, requestId: 'req-public-profile' });
const review = (id: string, raterFirstName: string) => ({
  id,
  direction: 'REQUESTER_TO_RUNNER',
  scores: { overall: 5, reliability: 5, communication: 5, timeliness: 5, paymentConduct: 5 },
  review: 'Great communication and right on time.',
  raterFirstName,
  raterLastInitial: 'C',
  createdAt: '2026-02-10T12:00:00.000Z',
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>
        <PublicProfilePage userId={profile.id} />
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

describe('public profile', () => {
  it('shows counts without an average below three ratings and loads more reviews by cursor', async () => {
    const user = userEvent.setup();
    const cursors: Array<string | null> = [];
    server.use(
      http.get(`*/api/v1/users/${profile.id}`, () => envelope(profile)),
      http.get(`*/api/v1/users/${profile.id}/ratings`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return cursor
          ? envelope([review('review-2', 'Chioma')], { hasNextPage: false })
          : envelope([review('review-1', 'Kunle')], { hasNextPage: true, nextCursor: 'next-page-token' });
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Tunde O.' })).toBeInTheDocument();
    expect(screen.getByText('2 ratings')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Runner rating summary' })).queryByText('4.9', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('52 as runner · 4 as requester')).toBeInTheDocument();
    expect(await screen.findByText('Kunle C.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load more reviews' }));
    expect(await screen.findByText('Chioma C.')).toBeInTheDocument();
    await waitFor(() => expect(cursors).toEqual([null, 'next-page-token']));
  });

  it('submits a private user report with an idempotency key and confirms a block', async () => {
    const user = userEvent.setup();
    let reportBody: unknown;
    let idempotencyKey: string | null = null;
    let blockedId: string | undefined;
    server.use(
      http.get(`*/api/v1/users/${profile.id}`, () => envelope(profile)),
      http.get(`*/api/v1/users/${profile.id}/ratings`, () => envelope([], { hasNextPage: false })),
      http.post('*/api/v1/reports', async ({ request }) => {
        reportBody = await request.json();
        idempotencyKey = request.headers.get('Idempotency-Key');
        return envelope({ id: 'report-1' }, {});
      }),
      http.post('*/api/v1/users/:id/block', ({ params }) => {
        blockedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Report this person' }));
    await user.selectOptions(screen.getByLabelText('Reason'), 'HARASSMENT');
    await user.type(screen.getByLabelText('Report details'), 'Unwanted repeated contact.');
    await user.click(screen.getByRole('button', { name: 'Send report' }));

    await waitFor(() => expect(reportBody).toEqual({
      targetType: 'USER',
      targetId: profile.id,
      type: 'HARASSMENT',
      description: 'Unwanted repeated contact.',
    }));
    expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await screen.findByRole('button', { name: 'Report this person' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Block' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Existing chats become read-only');
    await user.click(screen.getByRole('button', { name: 'Block person' }));
    await waitFor(() => expect(blockedId).toBe(profile.id));
  });
});
