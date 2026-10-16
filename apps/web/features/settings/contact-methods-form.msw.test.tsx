import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { apiError, listen, server } from '@/test/msw/server';
import { ContactMethodsForm } from './contact-methods-form';

/** One account, several ways to sign in: add an email to a phone account without a second profile. */

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/settings/contact',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@/features/auth/google-confirm', () => ({
  GoogleConfirm: ({ onToken }: { onToken: (token: string) => void }) => (
    <button onClick={() => onToken('test-google-confirmation')}>Confirm with Google</button>
  ),
}));

const ME: Me = {
  id: 'u1',
  name: 'Ada Obi',
  firstName: 'Ada',
  lastName: 'Obi',
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
  createdAt: '2026-01-01T00:00:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-msw' });

function renderForm(me: Me = ME) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>
        <ContactMethodsForm />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
  refresh.mockClear();
});
afterAll(() => server.close());

describe('ContactMethodsForm', () => {
  it('shows the phone as verified and the email as not added', () => {
    renderForm();

    expect(screen.getByText('+2348031234567')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Not added')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add email' })).toBeInTheDocument();
  });

  it('validates the phone on blur, not while typing, and clears the error after correction', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Change' }));
    const phone = screen.getByLabelText('New phone number');
    expect(screen.queryByText(/Use 11 digits/)).not.toBeInTheDocument();
    await user.type(phone, '+2348147877487');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid 11-digit Nigerian mobile number');
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    await user.clear(phone);
    await user.type(phone, '08147877487');
    await user.tab();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(phone).not.toHaveAttribute('aria-invalid');
  });

  it('sends codes only for 11-digit local Nigerian mobile numbers', async () => {
    const sent: string[] = [];
    server.use(http.post('*/api/v1/me/contact', async ({ request }) => {
      const body = await request.json() as { phone: string };
      sent.push(body.phone);
      return envelope({ sentTo: 'Your phone' });
    }));
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Change' }));
    const phone = screen.getByLabelText('New phone number');
    await user.type(screen.getByLabelText('Your password'), 'local-format-proof');

    for (const invalid of ['+2348147877487', '2348147877487', '8147877487', '0814787748', '081478774870', '07601234567', '0814787a487', '0803 123 4567']) {
      await user.clear(phone);
      await user.type(phone, invalid);
      await user.click(screen.getByRole('button', { name: 'Send code' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid 11-digit Nigerian mobile number');
      expect(screen.queryByRole('group', { name: '6-digit code' })).not.toBeInTheDocument();
    }
    expect(sent).toEqual([]);

    for (const valid of ['07031234567', '08031234567', '08147877487', '09031234567', '09131234567']) {
      await user.clear(screen.getByLabelText('New phone number'));
      await user.type(screen.getByLabelText('New phone number'), valid);
      await user.click(screen.getByRole('button', { name: 'Send code' }));
      expect(await screen.findByRole('group', { name: '6-digit code' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Back' }));
    }
    expect(sent).toEqual(['+2347031234567', '+2348031234567', '+2348147877487', '+2349031234567', '+2349131234567']);
  });

  it('adds an email: password proof, code, then verified', async () => {
    const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
    server.use(
      http.post('*/api/v1/me/contact', async ({ request }) => {
        calls.push({ path: 'contact', body: (await request.json()) as Record<string, unknown> });
        return envelope({ sentTo: 'a***@example.com' });
      }),
      http.post('*/api/v1/me/contact/verify', async ({ request }) => {
        calls.push({ path: 'verify', body: (await request.json()) as Record<string, unknown> });
        return envelope({ kind: 'email', value: 'a***@example.com' });
      }),
      http.get('*/api/v1/me', () => envelope({ ...ME, email: 'ada@example.com', emailVerified: true })),
    );
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Add email' }));
    await user.type(screen.getByLabelText('Email'), 'Ada@Example.com');
    const sendCode = screen.getByRole('button', { name: 'Send code' });
    expect(sendCode).toBeDisabled();
    await user.type(screen.getByLabelText('Your password'), 'temporary-proof');
    expect(sendCode).toBeEnabled();
    await user.clear(screen.getByLabelText('Your password'));
    expect(sendCode).toBeDisabled();
    await user.type(screen.getByLabelText('Your password'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Send code' }));

    expect(await screen.findByText(/code we sent to a\*\*\*@example\.com/)).toBeInTheDocument();
    const boxes = screen.getAllByRole('textbox');
    for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
      await user.type(boxes[index] as HTMLElement, digit);
    }

    await waitFor(() => expect(screen.getByText('Your email is saved and verified.')).toBeInTheDocument());
    expect(calls[0]).toEqual({ path: 'contact', body: { email: 'ada@example.com', currentPassword: 'correct horse' } });
    expect(calls[1]).toEqual({ path: 'verify', body: { email: 'ada@example.com', code: '123456' } });
    expect(refresh).toHaveBeenCalled();
  });

  it('keeps the sign-in method clear when the email belongs to another account', async () => {
    server.use(
      http.post('*/api/v1/me/contact', () => apiError(409, 'IDENTIFIER_TAKEN', 'Taken.')),
    );
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Add email' }));
    await user.type(screen.getByLabelText('Email'), 'other@example.com');
    await user.type(screen.getByLabelText('Your password'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Send code' }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });

  it('enables sending only after Google confirmation and clears confirmation when cancelled', async () => {
    let body: unknown;
    server.use(http.post('*/api/v1/me/contact', async ({ request }) => {
      body = await request.json();
      return envelope({ sentTo: 'a***@example.com' });
    }));
    const user = userEvent.setup();
    renderForm({ ...ME, hasPassword: false, googleLinked: true });

    await user.click(screen.getByRole('button', { name: 'Add email' }));

    expect(screen.queryByLabelText('Your password')).not.toBeInTheDocument();
    expect(screen.getByText(/signs in with Google and has no password/i)).toBeInTheDocument();
    const sendCode = screen.getByRole('button', { name: 'Send code' });
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    expect(sendCode).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Confirm with Google' }));
    expect(sendCode).toBeEnabled();
    await user.click(sendCode);
    expect(await screen.findByRole('group', { name: '6-digit code' })).toBeInTheDocument();
    expect(body).toEqual({ email: 'ada@example.com', googleIdToken: 'test-google-confirmation' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Add email' }));
    expect(screen.getByRole('button', { name: 'Send code' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm with Google' })).toBeInTheDocument();
  });
});
