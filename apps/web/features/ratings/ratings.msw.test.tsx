import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IsRestoringProvider, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { listen, server } from '@/test/msw/server';
import { AssignmentRatingPage } from './assignment-rating-page';
import { RatingsPage } from './ratings-page';
import type { AssignmentRatings, MyRating, Rating } from './api';

const me = { id: 'ratings-user', name: 'Ada Okafor', firstName: 'Ada', lastName: 'Okafor', status: 'ACTIVE', startMode: 'RUNNER' } as Me;
const scores = { overall: 5, reliability: null, communication: 4, timeliness: null, paymentConduct: null };
const rating: Rating = { id: 'rating-1', assignmentId: 'assignment-1', direction: 'RUNNER_TO_REQUESTER', scores, review: 'My fair review', status: 'PUBLISHED', revealed: false, editable: true, editableUntil: '2099-01-01T00:00:00Z', createdAt: '2026-10-01T00:00:00Z' };
const initial: AssignmentRatings = { canRate: true, reason: null, mine: null, theirs: null, counterpartRated: false, windowEndsAt: '2099-01-01T00:00:00Z' };
const listed: MyRating = { ...rating, errandTitle: 'Collect the groceries', counterpartFirstName: 'Musa', counterpartLastInitial: 'I', revealed: true };
const envelope = (data: unknown, meta: object = {}) => HttpResponse.json({ data, meta, requestId: 'req-ratings' });
const failure = (code: string, reason?: string, status = 403) => HttpResponse.json({ error: { code, message: 'Rating failed', details: { reason } }, requestId: 'req-rating-failed' }, { status });

function mount(component: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SessionProvider me={me}>{component}</SessionProvider></QueryClientProvider>);
}
function assignment(data: AssignmentRatings) {
  server.use(http.get('*/api/v1/assignments/:id/ratings', () => envelope(data)));
}
beforeAll(() => listen());
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

/** Tap the stars of a rating group: the page uses stars, not menus. */
async function tapStars(user: ReturnType<typeof userEvent.setup>, group: string, count: number) {
  const radios = await screen.findByRole('radiogroup', { name: group });
  await user.click(within(radios).getByRole('radio', { name: `${count} ${count === 1 ? 'star' : 'stars'}` }));
}

describe('assignment rating public UI', () => {
  it.each(['assignment', 'list'])('keeps a loading skeleton during persisted-cache restoration: %s', (view) => {
    mount(<IsRestoringProvider value={true}>{view === 'assignment' ? <AssignmentRatingPage assignmentId="assignment-1" /> : <RatingsPage />}</IsRestoringProvider>);
    expect(screen.getByLabelText('Loading ratings')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('No received ratings yet')).not.toBeInTheDocument();
  });

  it('hides a malicious unrevealed counterpart fixture, then displays only a server-confirmed reveal', async () => {
    const data: AssignmentRatings = { ...initial, mine: rating, canRate: false, counterpartRated: true, theirs: { ...rating, id: 'malicious', review: 'SECRET COUNTERPART REVIEW', revealed: false } };
    assignment(data);
    const view = mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    await screen.findByText('My fair review', { selector: 'p' });
    expect(screen.queryByText('SECRET COUNTERPART REVIEW')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Report rating' })).not.toBeInTheDocument();
    expect(screen.getByText(/Their rating stays hidden/)).toBeInTheDocument();
    data.mine = { ...rating, revealed: true, editable: false };
    data.theirs = { ...data.theirs!, revealed: true };
    view.unmount();
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    expect(await screen.findByText('SECRET COUNTERPART REVIEW')).toBeInTheDocument();
  });

  it('shows revealed counterpart content and the report integration link', async () => {
    assignment({ ...initial, canRate: false, mine: { ...rating, revealed: true, editable: false }, theirs: { ...rating, id: 'received-1', revealed: true, review: 'Helpful and clear' } });
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    expect(await screen.findByText('Helpful and clear')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Report rating' })).toHaveAttribute('href', '/report?targetType=RATING&targetId=received-1');
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('submits overall, optional dimensions and review; reuses its intent key on retry but not changed intent', async () => {
    const user = userEvent.setup();
    let data = { ...initial };
    const requests: { key: string | null; body: unknown }[] = [];
    server.use(
      http.get('*/api/v1/assignments/:id/ratings', () => envelope(data)),
      http.post('*/api/v1/assignments/:id/ratings', async ({ request }) => {
        const body = await request.json();
        requests.push({ key: request.headers.get('Idempotency-Key'), body });
        if (requests.length < 3) return failure('SERVER_ERROR', undefined, 500);
        data = { ...initial, mine: rating, canRate: false };
        return envelope(rating);
      }),
    );
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    await tapStars(user, 'Overall', 5);
    await tapStars(user, 'Communication', 4);
    await user.type(screen.getByRole('textbox'), 'Fair and helpful');
    await user.click(screen.getByRole('button', { name: 'Submit rating' }));
    await screen.findByRole('alert');
    expect(screen.getByText(/req-rating-failed/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit rating' }));
    await waitFor(() => expect(requests).toHaveLength(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit rating' })).toBeEnabled());
    await user.type(screen.getByRole('textbox'), '!');
    await user.click(screen.getByRole('button', { name: 'Submit rating' }));
    await screen.findByText('My fair review', { selector: 'p' });
    expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/);
    expect(requests[1].key).toBe(requests[0].key);
    expect(requests[2].key).not.toBe(requests[0].key);
    expect(requests[0].body).toEqual({ scores: { overall: 5, communication: 4 }, review: 'Fair and helpful' });
  });

  it('uses stars: the submit button waits for an overall star, and shows what was chosen', async () => {
    const user = userEvent.setup();
    server.use(http.get('*/api/v1/assignments/:id/ratings', () => envelope({ ...initial })));
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);

    const submit = await screen.findByRole('button', { name: 'Submit rating' });
    expect(submit).toBeDisabled();
    expect(screen.getByText('Tap a star')).toBeInTheDocument();
    await tapStars(user, 'Overall', 4);

    expect(submit).toBeEnabled();
    expect(screen.getByText('4 of 5')).toBeInTheDocument();
    expect(within(screen.getByRole('radiogroup', { name: 'Overall' })).getByRole('radio', { name: '4 stars' })).toBeChecked();
  });

  it('an optional star can be taken back by tapping it again, and is then left out of the request', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.get('*/api/v1/assignments/:id/ratings', () => envelope({ ...initial })),
      http.post('*/api/v1/assignments/:id/ratings', async ({ request }) => { body = await request.json(); return envelope(rating); }),
    );
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);

    await tapStars(user, 'Overall', 5);
    await tapStars(user, 'Timeliness', 3);
    await tapStars(user, 'Timeliness', 3);
    await user.click(screen.getByRole('button', { name: 'Submit rating' }));

    await waitFor(() => expect(body).toEqual({ scores: { overall: 5 }, review: '' }));
  });

  it('edits through PATCH, including clearing review text', async () => {
    const user = userEvent.setup();
    let data = { ...initial, mine: rating, canRate: false };
    let body: unknown;
    server.use(http.get('*/api/v1/assignments/:id/ratings', () => envelope(data)), http.patch('*/api/v1/ratings/:id', async ({ request, params }) => {
      expect(params.id).toBe('rating-1');
      body = await request.json();
      data = { ...data, mine: { ...rating, scores: { ...scores, overall: 4 }, review: null } };
      return envelope(data.mine);
    }));
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    await tapStars(user, 'Overall', 4);
    await user.clear(screen.getByRole('textbox'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(body).toEqual({ scores: { overall: 4, communication: 4 }, review: null }));
    expect(await screen.findByText('Your rating was saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('disables editing when the server deadline expires while the page is open', async () => {
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    assignment({ ...initial, canRate: false, mine: { ...rating, editableUntil: new Date(now + 1000).toISOString() } });
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    await screen.findByRole('button', { name: 'Save changes' });
    now += 2000;
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument());
    expect(screen.getByText(/The edit window has closed/)).toBeInTheDocument();
  });

  it.each(['NOT_COMPLETED', 'WINDOW_CLOSED'] as const)('respects canRate=false: %s', async (reason) => {
    assignment({ ...initial, canRate: false, reason });
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    await screen.findByRole('heading', { name: 'Rate your errand' });
    expect(screen.queryByRole('button', { name: 'Submit rating' })).not.toBeInTheDocument();
  });

  it.each(['EDIT_WINDOW_CLOSED', 'REVEALED', 'MODERATED', 'NOT_COMPLETED', 'WINDOW_CLOSED'])('locks controls after API rejection: %s', async (reason) => {
    const user = userEvent.setup();
    assignment({ ...initial, canRate: false, mine: rating });
    server.use(http.patch('*/api/v1/ratings/:id', () => failure('RATING_NOT_ELIGIBLE', reason)));
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    await user.click(await screen.findByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('req-rating-failed');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('recovers an already-submitted rating from the API', async () => {
    const user = userEvent.setup();
    let data = { ...initial };
    server.use(http.get('*/api/v1/assignments/:id/ratings', () => envelope(data)), http.post('*/api/v1/assignments/:id/ratings', () => {
      data = { ...initial, mine: rating, canRate: false };
      return failure('RATING_ALREADY_SUBMITTED', undefined, 409);
    }));
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    await tapStars(user, 'Overall', 5);
    await user.click(screen.getByRole('button', { name: 'Submit rating' }));
    expect(await screen.findByText('My fair review', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit rating' })).not.toBeInTheDocument();
  });

  it('retains the API rejection reason and request ID after refreshing removes the editor', async () => {
    const user = userEvent.setup();
    let data = { ...initial, canRate: false, mine: rating };
    server.use(http.get('*/api/v1/assignments/:id/ratings', () => envelope(data)), http.patch('*/api/v1/ratings/:id', () => {
      data = { ...data, mine: { ...rating, editable: false, status: 'UNDER_REVIEW' } };
      return failure('RATING_NOT_ELIGIBLE', 'MODERATED');
    }));
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    await user.click(await screen.findByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('being moderated');
    expect(screen.getByRole('alert')).toHaveTextContent('req-rating-failed');
  });

  it.each([403, 404, 500])('renders access/not-found/error states with request ID and retry: %s', async (status) => {
    server.use(http.get('*/api/v1/assignments/:id/ratings', () => failure('ERROR', undefined, status)));
    mount(<AssignmentRatingPage assignmentId="assignment-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('req-rating-failed');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('received and given ratings public UI', () => {
  it('paginates received ratings, hides malicious unrevealed content and switches to given', async () => {
    const user = userEvent.setup();
    const queries: string[] = [];
    server.use(http.get('*/api/v1/me/ratings', ({ request }) => {
      const url = new URL(request.url);
      queries.push(url.search);
      if (url.searchParams.get('direction') === 'GIVEN') return envelope([{ ...listed, id: 'given', review: 'My given review', revealed: false }]);
      if (url.searchParams.get('cursor')) return envelope([{ ...listed, id: 'page-2', review: 'Second page review' }]);
      return envelope([{ ...listed, id: 'hidden', revealed: false, review: 'SECRET LIST CONTENT', counterpartFirstName: 'SECRET NAME' }, listed], { nextCursor: 'next-page' });
    }));
    mount(<RatingsPage />);
    await screen.findByText('My fair review');
    expect(screen.queryByText('SECRET LIST CONTENT')).not.toBeInTheDocument();
    expect(screen.queryByText(/SECRET NAME/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Report rating' })).toHaveAttribute('href', '/report?targetType=RATING&targetId=rating-1');
    await user.click(screen.getByRole('button', { name: 'Load more ratings' }));
    expect(await screen.findByText('Second page review')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Given' }));
    expect(await screen.findByText('My given review')).toBeInTheDocument();
    expect(screen.queryByText('Second page review')).not.toBeInTheDocument();
    expect(queries.some((query) => query.includes('cursor=next-page'))).toBe(true);
    expect(queries.some((query) => query.includes('direction=GIVEN'))).toBe(true);
  });

  it('shows an actionable empty state', async () => {
    server.use(http.get('*/api/v1/me/ratings', () => envelope([])));
    mount(<RatingsPage />);
    expect(await screen.findByText('No received ratings yet')).toBeInTheDocument();
  });
});
