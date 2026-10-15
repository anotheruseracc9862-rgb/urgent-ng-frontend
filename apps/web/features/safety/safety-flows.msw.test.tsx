import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { AssignmentHubPage } from '@/features/assignments/hub/assignment-hub-page';
import { OpenDisputePage } from './disputes/open-dispute-page';
import { DisputeDetailPage } from './disputes/dispute-detail-page';
import { ReportPage } from './reports/report-page';
import { ReportsPage } from './reports/reports-page';
import { SafetyCenterPage } from './safety-center-page';

const id = '92771111-1111-4111-8111-111111111111';
const other = '92772222-2222-4222-8222-222222222222';
const envelope = (data: unknown, meta = {}) => HttpResponse.json({ data, meta, requestId: 'case-success' });
const failure = (code: string, details = {}, status = 400) => HttpResponse.json({ error: { code, message: 'Backend text must not leak', details }, requestId: 'case-failure' }, { status });
const assignment = (status = 'IN_PROGRESS') => ({ id, errandId: other, requesterId: 'requester', runnerId: 'runner', role: 'RUNNER', status: 'ACCEPTED', agreedAmountMinor: 400000, selectedAt: '2026-10-15T08:00:00Z', errand: { id: other, title: 'Parcel delivery', description: 'Collect a parcel', status, accessLevel: 'EXACT', pickup: null, destination: null, photos: [], pickupContact: null, dropoffContact: null } });
const dispute = { id, assignmentId: id, errandId: other, status: 'OPEN', type: 'ITEM_DAMAGED', claim: 'The parcel was damaged.', openedByMe: true, evidence: [], canAddEvidence: true, createdAt: '2026-10-15T08:00:00Z', firstResponseDueAt: null, resolutionDueAt: null, resolution: null, resolutionNotes: null, resolvedAt: null };
const report = { id, targetType: 'ERRAND', type: 'UNSAFE_BEHAVIOR', status: 'OPEN', description: 'Unsafe handling', errandId: other, outcome: null, resolvedAt: null, firstResponseDueAt: null, pausesAutoCompletion: true, evidence: [], createdAt: '2026-10-15T08:00:00Z' };
const me: Me = { id: 'runner', name: 'Ada Test', firstName: 'Ada', lastName: 'Test', phone: null, phoneVerified: true, email: null, emailVerified: false, hasPassword: true, googleLinked: false, status: 'ACTIVE', startMode: 'RUNNER', photoMediaId: null, bio: null, homeArea: null, deletionScheduledAt: null, createdAt: '2026-01-01T00:00:00Z' };
function mount(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><SessionProvider me={me}>{children}</SessionProvider></QueryClientProvider>);
  return client;
}
beforeAll(() => listen());
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());

it('opens a dispute with evidence, preserves retries, and refreshes the visible assignment state', async () => {
  const user = userEvent.setup();
  let status = 'IN_PROGRESS';
  const keys: string[] = [];
  const bodies: unknown[] = [];
  server.use(
    http.get('*/api/v1/assignments/:id', () => envelope(assignment(status))),
    http.get('*/api/v1/assignments/:id/timeline', () => envelope([])),
    http.post('*/api/v1/assignments/:id/disputes', async ({ request }) => {
      keys.push(request.headers.get('Idempotency-Key')!); bodies.push(await request.json());
      if (keys.length === 1) return failure('INTERNAL_ERROR', {}, 500);
      status = 'DISPUTED'; return envelope(dispute);
    }),
    http.get('*/api/v1/disputes/:id', () => envelope(dispute)),
  );
  mount(<><div data-testid="hub"><AssignmentHubPage assignmentId={id} /></div><OpenDisputePage assignmentId={id} /></>);
  await user.type(await screen.findByLabelText(/What happened/), 'The parcel was damaged.');
  await user.type(screen.getByLabelText('Evidence statement'), 'Packaging was torn.');
  await user.click(screen.getByRole('button', { name: 'Attach evidence' }));
  await user.click(screen.getByRole('button', { name: 'Submit dispute' }));
  await screen.findByText('Request ID: case-failure');
  await user.click(screen.getByRole('button', { name: 'Submit dispute' }));
  expect(await screen.findByRole('heading', { name: 'The claim' })).toBeInTheDocument();
  expect(keys[0]).toBeTruthy(); expect(keys[0]).toBe(keys[1]);
  expect(bodies[1]).toEqual({ type: 'ITEM_NOT_DELIVERED', claim: 'The parcel was damaged.', evidence: [{ sourceType: 'STATEMENT', statement: 'Packaging was torn.' }] });
  const hub = within(screen.getByTestId('hub'));
  expect(await hub.findByText('Disputed', { exact: true })).toBeInTheDocument();
  expect(hub.queryByRole('link', { name: 'Continue errand' })).not.toBeInTheDocument();
});

it('refuses evidence from another errand and retains the item for correction', async () => {
  const user = userEvent.setup();
  let submitted: unknown;
  server.use(http.get('*/api/v1/disputes/:id', () => envelope(dispute)), http.post('*/api/v1/disputes/:id/evidence', async ({ request }) => { submitted = await request.json(); return failure('VALIDATION_ERROR', { field: 'sourceId' }); }));
  mount(<DisputeDetailPage disputeId={id} />);
  await user.selectOptions(await screen.findByLabelText('Evidence type'), 'MESSAGE');
  await user.type(screen.getByLabelText(/Message reference/), other);
  await user.click(screen.getByRole('button', { name: 'Attach evidence' }));
  await user.click(screen.getByRole('button', { name: 'Send evidence' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('References must belong to this errand');
  expect(screen.getByRole('alert')).not.toHaveTextContent('Backend text');
  expect(submitted).toEqual({ sourceType: 'MESSAGE', sourceId: other });
  expect(screen.getByRole('button', { name: 'Remove evidence 1' })).toBeInTheDocument();
});

it('shows newly added evidence and removes the editor when the server closes the case', async () => {
  const user = userEvent.setup();
  let closed = false;
  let added = false;
  const current = () => ({ ...dispute, status: closed ? 'RESOLVED' : 'OPEN', canAddEvidence: !closed, evidence: added ? [{ id: other, sourceType: 'STATEMENT', statement: 'My side.', sourceId: null, addedByMe: true, createdAt: dispute.createdAt }] : [] });
  server.use(http.get('*/api/v1/disputes/:id', () => envelope(current())), http.post('*/api/v1/disputes/:id/evidence', () => {
    if (!added) { added = true; return envelope(current()); }
    closed = true; return failure('ERRAND_INVALID_STATE', { reason: 'DISPUTE_CLOSED' }, 409);
  }));
  mount(<DisputeDetailPage disputeId={id} />);
  await user.type(await screen.findByLabelText('Evidence statement'), 'My side.');
  await user.click(screen.getByRole('button', { name: 'Attach evidence' }));
  await user.click(screen.getByRole('button', { name: 'Send evidence' }));
  expect(await screen.findByText('My side.', { selector: 'p' })).toBeInTheDocument();
  await user.type(screen.getByLabelText('Evidence statement'), 'Another detail.');
  await user.click(screen.getByRole('button', { name: 'Attach evidence' }));
  await user.click(screen.getByRole('button', { name: 'Send evidence' }));
  expect(await screen.findByText('This dispute is closed. Evidence can no longer be added.')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Send evidence' })).not.toBeInTheDocument());
});

it('links to the backend existing dispute instead of opening another case', async () => {
  const user = userEvent.setup();
  server.use(http.get('*/api/v1/assignments/:id', () => envelope(assignment())), http.post('*/api/v1/assignments/:id/disputes', () => failure('DISPUTE_ALREADY_OPEN', { disputeId: other }, 409)));
  mount(<OpenDisputePage assignmentId={id} />);
  await user.type(await screen.findByLabelText(/What happened/), 'An issue.');
  await user.click(screen.getByRole('button', { name: 'Submit dispute' }));
  expect(await screen.findByRole('link', { name: 'View existing dispute' })).toHaveAttribute('href', `/disputes/${other}`);
});

it('reopens a disputed assignment from a fresh query cache for either party', async () => {
  server.use(
    http.get('*/api/v1/assignments/:id', () => envelope({ ...assignment('DISPUTED'), role: 'REQUESTER', disputeId: other })),
    http.get('*/api/v1/assignments/:id/timeline', () => envelope([])),
  );
  mount(<><AssignmentHubPage assignmentId={id} /><OpenDisputePage assignmentId={id} /></>);
  expect(await screen.findByRole('link', { name: 'View dispute', exact: true })).toHaveAttribute('href', `/disputes/${other}`);
  expect(await screen.findByRole('link', { name: 'View existing dispute' })).toHaveAttribute('href', `/disputes/${other}`);
  expect(screen.queryByRole('button', { name: 'Submit dispute' })).not.toBeInTheDocument();
});

it('submits a contextual conduct report and shows the server completion hold', async () => {
  const user = userEvent.setup(); let body: unknown;
  server.use(http.post('*/api/v1/reports', async ({ request }) => { body = await request.json(); return envelope(report); }), http.get('*/api/v1/reports/:id', () => envelope(report)), http.get('*/api/v1/reports', () => envelope([])));
  mount(<ReportPage targetType="USER" targetId={id} assignmentId={other} />);
  await user.type(screen.getByLabelText(/Report details/), 'Unsafe handling');
  await user.selectOptions(screen.getByLabelText('Reason'), 'UNSAFE_BEHAVIOR');
  await user.click(screen.getByRole('button', { name: 'Send report' }));
  expect(await screen.findByText('Automatic completion is paused while this report is open.')).toBeInTheDocument();
  expect(body).toEqual({ targetType: 'USER', targetId: id, assignmentId: other, type: 'UNSAFE_BEHAVIOR', description: 'Unsafe handling' });
});

it('reports a received rating through its specialized endpoint', async () => {
  const user = userEvent.setup(); let body: unknown;
  server.use(http.post('*/api/v1/ratings/:id/report', async ({ request }) => { body = await request.json(); return envelope({ ...report, targetType: 'RATING' }); }), http.get('*/api/v1/reports/:id', () => envelope(report)), http.get('*/api/v1/reports', () => envelope([])));
  mount(<ReportPage targetType="RATING" targetId={id} />);
  await user.type(screen.getByLabelText(/Report details/), 'Abusive review');
  await user.click(screen.getByRole('button', { name: 'Send report' }));
  await screen.findByText('Report reference: ' + id);
  expect(body).toEqual({ type: 'USER_BEHAVIOR', description: 'Abusive review' });
});

it('pages reports and makes each case reachable', async () => {
  const user = userEvent.setup();
  server.use(http.get('*/api/v1/reports', ({ request }) => new URL(request.url).searchParams.has('cursor') ? envelope([{ ...report, id: other, type: 'FRAUD' }]) : envelope([report], { nextCursor: 'next' })));
  mount(<ReportsPage />);
  expect(await screen.findByRole('link', { name: /Unsafe Behavior/ })).toHaveAttribute('href', `/reports/${id}`);
  await user.click(screen.getByRole('button', { name: 'Load more reports' }));
  expect(await screen.findByRole('link', { name: /Fraud/ })).toHaveAttribute('href', `/reports/${other}`);
});

it('connects safety actions to the current assignment and real flows', async () => {
  server.use(http.get('*/api/v1/assignments/:id', () => envelope(assignment())));
  mount(<SafetyCenterPage assignmentId={id} />);
  await screen.findByText('Parcel delivery');
  expect(screen.getByRole('link', { name: /Open or view a dispute/ })).toHaveAttribute('href', `/assignments/${id}/dispute`);
  expect(screen.getByRole('link', { name: /Share progress/ })).toHaveAttribute('href', `/errands/${other}/share`);
  expect(screen.getByRole('link', { name: /Report a concern/ })).toHaveAttribute('href', `/report?targetType=ERRAND&targetId=${other}`);
  expect(screen.getByRole('link', { name: /Get help/ })).toHaveAttribute('href', '/help');
  expect(screen.getByRole('link', { name: /Manage blocked people/ })).toHaveAttribute('href', '/settings/blocked');
  expect(screen.getByRole('button', { name: 'Block', exact: true })).toBeInTheDocument();
});
