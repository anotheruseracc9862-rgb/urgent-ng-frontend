import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPendingIdentity, setPendingVerify } from '@/lib/auth/pending-identity';
import { VerifyOtpForm } from './verify-otp-form';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/verify',
  useSearchParams: () => new URLSearchParams(),
}));

const verifyOtp = vi.hoisted(() => vi.fn());
const me = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/auth', () => ({ authApi: { verifyOtp, me, resendOtp: vi.fn() } }));

beforeEach(() => {
  act(() => setPendingVerify({ via: 'phone', phone: '+2348031234567' }));
});
afterEach(() => {
  cleanup();
  act(() => clearPendingIdentity());
  vi.clearAllMocks();
});

describe('VerifyOtpForm', () => {
  const enterCode = async () => {
    const user = userEvent.setup();
    render(<VerifyOtpForm />);
    await user.click(screen.getByLabelText('Digit 1'));
    await user.paste('123456');
  };
  const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });

  it('takes a signed-in new account to choose what to do first, never back to register', async () => {
    verifyOtp.mockResolvedValue({ verified: true });
    me.mockResolvedValue({ id: 'u1', startMode: null });
    await enterCode();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/onboarding'));
    // Clearing the pending context after success used to trigger a second redirect to /register.
    await settle();
    expect(router.replace).not.toHaveBeenCalledWith('/register');
    expect(router.replace).not.toHaveBeenCalledWith('/login?verified=1');
  });

  it('goes to the dashboard when the account already chose a mode', async () => {
    verifyOtp.mockResolvedValue({ verified: true });
    me.mockResolvedValue({ id: 'u1', startMode: 'RUNNER' });
    await enterCode();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('falls back to login when the server did not start a session', async () => {
    verifyOtp.mockResolvedValue({ verified: true });
    me.mockRejectedValue(new Error('no session'));
    await enterCode();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login?verified=1'));
    await settle();
    expect(router.replace).not.toHaveBeenCalledWith('/register');
  });

  it('still sends a visitor with no pending context to register', async () => {
    act(() => setPendingVerify(null));
    render(<VerifyOtpForm />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/register'));
  });
});
