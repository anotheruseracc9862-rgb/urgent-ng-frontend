import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { apiError, listen, server } from '@/test/msw/server';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { VerificationPage } from './verification-page';

const me = {
  id: 'runner-1', firstName: 'Ada', lastName: 'Lovelace', name: 'Ada Lovelace',
  phone: '+2348031234567', phoneVerified: true, email: null, emailVerified: false,
  hasPassword: true, status: 'ACTIVE', startMode: 'RUNNER',
} as Me;

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

function renderPage(profile: Me = me) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider me={profile}><VerificationPage /></SessionProvider>
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
  it.each([
    { phone: '+2348031234567', feeRequired: false },
    { phone: null, feeRequired: true },
  ])('verifies a phone inline and preserves fee eligibility ($phone, fee=$feeRequired)', async ({ phone, feeRequired }) => {
    const user = userEvent.setup();
    let verified = false;
    let sent: unknown;
    let confirmed: unknown;
    const profile = { ...me, phone, phoneVerified: false };
    server.use(
      http.get('*/api/v1/verification', () => envelope({
        ...overview, phoneVerified: verified, canStart: verified && !feeRequired, feeRequired: verified && feeRequired,
      })),
      http.get('*/api/v1/me', () => envelope({ ...profile, phone: '+2348031234567', phoneVerified: verified })),
      http.post('*/api/v1/me/contact', async ({ request }) => {
        sent = await request.json();
        return envelope({ sentTo: '+234803***4567' });
      }),
      http.post('*/api/v1/me/contact/verify', async ({ request }) => {
        const body = await request.json() as { code: string };
        confirmed = body;
        if (body.code !== '123456') return apiError(400, 'OTP_INVALID', 'Invalid code.');
        verified = true;
        return envelope({ kind: 'phone', value: '+234803***4567' });
      }),
    );
    renderPage(profile);
    const number = await screen.findByLabelText('Phone number');
    expect(number).toHaveValue(phone ? '08031234567' : '');
    expect(screen.queryByRole('link', { name: 'Go to contact settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Email' })).not.toBeInTheDocument();
    await user.clear(number);
    await user.type(number, '08031234567');
    await user.type(screen.getByLabelText('Your password'), 'verification-proof');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(sent).toEqual({ phone: '+2348031234567', currentPassword: 'verification-proof' });
    await user.type(await screen.findByLabelText('Digit 1'), '654321');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Who are you?' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Digit 1'), '123456');
    expect(await screen.findByRole('heading', { name: feeRequired ? 'A verification fee is required' : 'Who are you?' })).toBeInTheDocument();
    expect(confirmed).toEqual({ phone: '+2348031234567', code: '123456' });
    expect(screen.queryByRole('heading', { name: 'Verify your phone first' })).not.toBeInTheDocument();
    if (feeRequired) expect(screen.queryByRole('heading', { name: 'Who are you?' })).not.toBeInTheDocument();
  });

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
