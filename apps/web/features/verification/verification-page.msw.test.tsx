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
  it('will not submit until all three confirmations are ticked: the details, how the data is used, and the licence declaration', async () => {
    const user = userEvent.setup();
    server.use(http.get('*/api/v1/verification', () => envelope(overview)));
    renderPage();
    await user.type(await screen.findByLabelText('Home address'), '12 Adeola Odeku Street');
    await user.type(screen.getByLabelText('Local government area'), 'Eti-Osa');
    await user.type(screen.getByLabelText('Date of birth'), '1990-01-01');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText('11-digit NIN'), '12345678901');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByRole('button', { name: 'Upload selfie' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    const submit = screen.getByRole('button', { name: 'Submit for verification' });
    const [details, data, licence] = screen.getAllByRole('checkbox');
    expect(submit).toBeDisabled();
    await user.click(details);
    await user.click(data);
    expect(submit).toBeDisabled();
    await user.click(licence);
    expect(submit).toBeEnabled();
    expect(screen.getByText(/The ID number is not stored, only a one-way fingerprint of it/)).toBeInTheDocument();
    expect(screen.getByText(/I hold any licence, permit or qualification that the work I offer legally requires/)).toBeInTheDocument();
  });

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
    expect(nin).toHaveAttribute('type', 'text');
    await user.type(nin, '12345678901');
    expect(nin).toHaveValue('12345678901');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByRole('button', { name: 'Upload selfie' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('NIN')).toBeInTheDocument();
    expect(screen.getByText('12345678901')).toBeInTheDocument();
    for (const box of screen.getAllByRole('checkbox')) await user.click(box);
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
    ['NAME_MISMATCH', /name you entered does not match/i],
    ['DOB_MISMATCH', /date of birth you entered does not match/i],
    ['NAME_AND_DOB_MISMATCH', /neither the name nor the date of birth/i],
    ['ID_NOT_FOUND', /could not find that NIN or BVN/i],
    ['SELFIE_UNUSABLE', /could not use your selfie/i],
  ])('shows the specific message for the failure detail %s', async (failureDetail, text) => {
    server.use(
      http.get('*/api/v1/verification', () => envelope({
        ...overview,
        status: 'FAILED',
        displayStatus: 'REJECTED',
        latestAttempt: {
          id: 'attempt-9', status: 'FAILED', displayStatus: 'REJECTED', failureReason: 'IDENTITY_MISMATCH', failureDetail,
          startedAt: '2026-10-14T10:00:00.000Z', completedAt: '2026-10-14T10:00:01.000Z', expiresAt: null, attemptNumber: 1,
        },
      })),
    );

    renderPage();

    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('collapses an address that autofill pasted twice, and shows it once on the review', async () => {
    const user = userEvent.setup();
    server.use(http.get('*/api/v1/verification', () => envelope(overview)));

    renderPage();
    const address = await screen.findByLabelText('Home address');
    await user.click(address);
    await user.paste('NO 319 Kawaji Road, Kano, NO 319 Kawaji Road, Kano');
    await user.tab();

    expect(address).toHaveValue('NO 319 Kawaji Road, Kano');
  });

  it('lets the runner verify with a BVN instead: sends bvn, not nin, and clears the number', async () => {
    const user = userEvent.setup();
    let submittedBody: Record<string, unknown> | undefined;
    server.use(
      http.get('*/api/v1/verification', () => envelope(overview)),
      http.post('*/api/v1/verification/attempts', async ({ request }) => {
        submittedBody = (await request.json()) as Record<string, unknown>;
        return envelope({
          id: 'attempt-2',
          status: 'VERIFIED',
          displayStatus: 'VERIFIED',
          failureReason: null,
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

    await user.click(await screen.findByRole('radio', { name: 'BVN' }));
    const bvn = screen.getByLabelText('11-digit BVN');
    await user.type(bvn, '22222222222');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByRole('button', { name: 'Upload selfie' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('BVN')).toBeInTheDocument();
    expect(screen.getByText('22222222222')).toBeInTheDocument();
    for (const box of screen.getAllByRole('checkbox')) await user.click(box);
    await user.click(screen.getByRole('button', { name: 'Submit for verification' }));

    await waitFor(() => expect(submittedBody).toMatchObject({ bvn: '22222222222', selfieMediaId: 'selfie-media-1' }));
    expect(submittedBody).not.toHaveProperty('nin');
    expect(window.localStorage.getItem('bvn')).toBeNull();
    expect(window.sessionStorage.getItem('bvn')).toBeNull();
  });

  describe('guarantor step', () => {
    async function toGuarantorStep() {
      const user = userEvent.setup();
      server.use(http.get('*/api/v1/verification', () => envelope(overview)));
      renderPage();
      await user.type(await screen.findByLabelText('Home address'), '12 Adeola Odeku Street');
      await user.type(screen.getByLabelText('Local government area'), 'Eti-Osa');
      await user.type(screen.getByLabelText('Date of birth'), '1990-01-01');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.type(await screen.findByLabelText('11-digit NIN'), '12345678901');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(await screen.findByRole('button', { name: 'Upload selfie' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      return user;
    }
    const heading = () => screen.queryByRole('heading', { name: /Guarantor/ });

    it.each(['+2348034567890', '2348034567890', '0803 456 7890'])('refuses the phone %s on the form, before submit', async (value) => {
      const user = await toGuarantorStep();
      await user.type(screen.getByLabelText('Full name'), 'Ngozi Okon');
      await user.type(screen.getByLabelText('Phone number'), value);
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByText(/11-digit mobile number starting with 0/)).toBeInTheDocument();
      expect(heading()).toBeInTheDocument();
    });

    it("refuses the runner's own phone and says so", async () => {
      const user = await toGuarantorStep();
      await user.type(screen.getByLabelText('Full name'), 'Ngozi Okon');
      await user.type(screen.getByLabelText('Phone number'), '08031234567');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByText(/needs a phone number of their own/)).toBeInTheDocument();
      expect(heading()).toBeInTheDocument();
    });

    it("refuses the runner's own name, in any order, as soon as the field is left", async () => {
      const user = await toGuarantorStep();
      await user.type(screen.getByLabelText('Full name'), 'Lovelace Ada');
      expect(screen.queryByText(/someone other than you/)).not.toBeInTheDocument();
      await user.tab();

      expect(await screen.findByText(/someone other than you/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(heading()).toBeInTheDocument();
    });

    it('needs both fields or neither', async () => {
      const user = await toGuarantorStep();
      await user.type(screen.getByLabelText('Full name'), 'Ngozi Okon');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      expect(await screen.findByText(/Enter your guarantor’s phone number/)).toBeInTheDocument();
      expect(heading()).toBeInTheDocument();
    });

    it('moves on with a valid guarantor and sends the phone as +234', async () => {
      let submittedBody: Record<string, unknown> | undefined;
      const user = await toGuarantorStep();
      server.use(
        http.post('*/api/v1/verification/attempts', async ({ request }) => {
          submittedBody = (await request.json()) as Record<string, unknown>;
          return envelope({ id: 'a-4', status: 'VERIFIED', displayStatus: 'VERIFIED', failureReason: null, startedAt: '2026-10-14T10:00:00.000Z', completedAt: null, expiresAt: null, attemptNumber: 1 });
        }),
      );
      await user.type(screen.getByLabelText('Full name'), 'Ngozi Okon');
      await user.type(screen.getByLabelText('Phone number'), '08034567890');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      for (const box of screen.getAllByRole('checkbox')) await user.click(box);
      await user.click(screen.getByRole('button', { name: 'Submit for verification' }));

      await waitFor(() => expect(submittedBody).toMatchObject({ guarantor: { fullName: 'Ngozi Okon', phone: '+2348034567890' } }));
    });

    it('Skip clears the guarantor and sends none', async () => {
      let submittedBody: Record<string, unknown> | undefined;
      const user = await toGuarantorStep();
      server.use(
        http.post('*/api/v1/verification/attempts', async ({ request }) => {
          submittedBody = (await request.json()) as Record<string, unknown>;
          return envelope({ id: 'a-5', status: 'VERIFIED', displayStatus: 'VERIFIED', failureReason: null, startedAt: '2026-10-14T10:00:00.000Z', completedAt: null, expiresAt: null, attemptNumber: 1 });
        }),
      );
      await user.type(screen.getByLabelText('Full name'), 'Lovelace Ada');
      await user.type(screen.getByLabelText('Phone number'), '+2348031234567');
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      for (const box of screen.getAllByRole('checkbox')) await user.click(box);
      await user.click(screen.getByRole('button', { name: 'Submit for verification' }));

      await waitFor(() => expect(submittedBody).toBeDefined());
      expect(submittedBody).not.toHaveProperty('guarantor');
    });
  });

  it('clears the number when the runner switches between NIN and BVN', async () => {
    const user = userEvent.setup();
    server.use(http.get('*/api/v1/verification', () => envelope(overview)));

    renderPage();
    await user.type(await screen.findByLabelText('Home address'), '12 Adeola Odeku Street');
    await user.type(screen.getByLabelText('Local government area'), 'Eti-Osa');
    await user.type(screen.getByLabelText('Date of birth'), '1990-01-01');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.type(await screen.findByLabelText('11-digit NIN'), '12345678901');
    await user.click(screen.getByRole('radio', { name: 'BVN' }));

    expect(screen.getByLabelText('11-digit BVN')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
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
