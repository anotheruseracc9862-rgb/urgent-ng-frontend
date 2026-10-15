import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { VerificationPage } from './verification-page';

vi.mock('@/lib/auth/client', () => ({
  useSession: () => ({
    me: { id: 'runner-1', firstName: 'Ada', lastName: 'Lovelace', phoneVerified: true },
  }),
}));

vi.mock('@/components/media-upload/media-upload', () => ({
  MediaUpload: ({ capture, onChange }: { capture?: string; onChange?: (ids: string[]) => void }) => (
    <button type="button" onClick={() => onChange?.([capture ? 'selfie-media-1' : 'id-media-1'])}>
      Upload {capture ? 'selfie' : 'ID'}
    </button>
  ),
}));

const envelope = (data: unknown) =>
  HttpResponse.json({ data, meta: {}, requestId: 'req-verification' });

const overview = {
  status: 'NOT_STARTED',
  displayStatus: 'NOT_STARTED',
  expiresAt: null,
  latestAttempt: null,
  nextAttemptAt: null,
  verified: false,
  phoneVerified: true,
  attemptsRemaining: 3,
  feeRequired: false,
  canStart: true,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <VerificationPage />
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('runner verification flow', () => {
  it('submits an 11-digit NIN once, then clears it from form state', async () => {
    const user = userEvent.setup();
    let submittedBody: unknown;
    server.use(
      http.get('*/api/v1/verification', () => envelope(overview)),
      http.post('*/api/v1/verification/attempts', async ({ request }) => {
        submittedBody = await request.json();
        return envelope({
          id: 'attempt-1',
          status: 'FAILED',
          displayStatus: 'REJECTED',
          failureReason: 'IDENTITY_MISMATCH',
          startedAt: '2026-10-14T10:00:00.000Z',
          completedAt: '2026-10-14T10:00:01.000Z',
          expiresAt: null,
          attemptNumber: 1,
        });
      }),
    );

    renderPage();
    await user.type(await screen.findByLabelText('Home address'), '12 Adeola Odeku Street');
    await user.type(screen.getByLabelText('Local government area'), 'Eti-Osa');
    await user.type(screen.getByLabelText('Date of birth'), '1990-01-01');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const nin = await screen.findByLabelText('11-digit NIN');
    await user.type(nin, '12345678901');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByRole('button', { name: 'Upload selfie' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Submit for verification' }));

    await waitFor(() => expect(submittedBody).toMatchObject({
      nin: '12345678901',
      selfieMediaId: 'selfie-media-1',
      identity: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateOfBirth: '1990-01-01',
        addressLine: '12 Adeola Odeku Street',
        lga: 'Eti-Osa',
      },
    }));
    await waitFor(() => expect(screen.getByText(/identity details did not match/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByLabelText('11-digit NIN')).toHaveValue(''));
    expect(window.localStorage.getItem('nin')).toBeNull();
    expect(window.sessionStorage.getItem('nin')).toBeNull();
  });

  it.each([
    ['DOCUMENT_INVALID', /could not read the identity document/i],
    ['SELFIE_MISMATCH', /selfie did not match/i],
    ['IDENTITY_MISMATCH', /identity details did not match/i],
    ['PROVIDER_ERROR', /verification service could not complete/i],
    ['PROVIDER_TIMEOUT', /took too long to respond/i],
    ['DUPLICATE_IDENTITY', /already registered to another account/i],
    ['USER_CANCELLED', /was cancelled before it could finish/i],
    ['INSUFFICIENT_DATA', /not enough information/i],
    ['MANUAL_REVIEW_REQUIRED', /need a manual review/i],
    ['OTHER', /could not verify these details/i],
  ])('shows actionable copy for %s', async (reason, message) => {
    server.use(http.get('*/api/v1/verification', () => envelope({
      ...overview,
      status: 'FAILED',
      displayStatus: 'REJECTED',
      latestAttempt: {
        id: 'attempt-failed',
        status: 'FAILED',
        displayStatus: 'REJECTED',
        failureReason: reason,
        startedAt: '2026-10-14T10:00:00.000Z',
        completedAt: '2026-10-14T10:00:01.000Z',
        expiresAt: null,
        attemptNumber: 1,
      },
    })));

    renderPage();
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('polls a pending attempt and explains that a manual review is in progress', async () => {
    server.use(http.get('*/api/v1/verification', () => envelope({
      ...overview,
      status: 'REVIEW_REQUIRED',
      displayStatus: 'PENDING',
      latestAttempt: {
        id: 'attempt-review',
        status: 'REVIEW_REQUIRED',
        displayStatus: 'PENDING',
        failureReason: 'MANUAL_REVIEW_REQUIRED',
        startedAt: '2026-10-14T10:00:00.000Z',
        completedAt: null,
        expiresAt: null,
        attemptNumber: 1,
      },
    })));

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Your verification needs review' })).toBeInTheDocument();
    expect(screen.getByText(/need a manual review/i)).toBeInTheDocument();
  });
});
