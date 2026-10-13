'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@urgent/ui';
import Link from 'next/link';

export function VerifyOtpForm() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationContext, setVerificationContext] = useState<{
    phone?: string;
    email?: string;
    verifyVia: 'phone' | 'email';
  } | null>(() => {
    // Lazy initialization: read from sessionStorage only once on mount
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem('pendingVerification');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Redirect if no verification context
    if (verificationContext === null) {
      router.push('/register');
    }
  }, [verificationContext, router]);

  useEffect(() => {
    // Cooldown timer
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    // Auto-focus first input
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6 && /^\d$/.test(digit)) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      // Focus last filled input or next empty
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (/^\d$/.test(value) || value === '') {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      // Move to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = code.join('');
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // TODO: Call POST /auth/otp/verify
      // const result = await apiClient.post('/auth/otp/verify', {
      //   code: otpCode,
      //   phone: verificationContext?.phone,
      //   email: verificationContext?.email,
      // });

      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clear verification context
      sessionStorage.removeItem('pendingVerification');

      // TODO: Handle actual login response (set session)
      // For now, redirect to dashboard
      router.push('/dashboard');
    } catch (error: unknown) {
      // Handle errors
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code?: string }).code;
        
        if (errorCode === 'OTP_INVALID') {
          const attempts = (error as { details?: { remainingAttempts?: number } }).details
            ?.remainingAttempts;
          setRemainingAttempts(attempts ?? null);
          setErrorMessage(
            attempts !== undefined && attempts > 0
              ? `Invalid code. ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'} remaining.`
              : 'Invalid code. Please try again.'
          );
        } else if (errorCode === 'OTP_EXPIRED') {
          setErrorMessage('This code has expired. Please request a new one.');
        } else if (errorCode === 'OTP_RATE_LIMITED') {
          const waitMinutes = (error as { details?: { waitSeconds?: number } }).details
            ?.waitSeconds
            ? Math.ceil(
                ((error as { details?: { waitSeconds?: number } }).details
                  ?.waitSeconds as number) / 60
              )
            : 60;
          setErrorMessage(
            `Too many attempts. Please wait ${waitMinutes} minutes before trying again.`
          );
        } else {
          setErrorMessage('Verification failed. Please try again.');
        }
      } else {
        setErrorMessage('Verification failed. Please try again.');
      }
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      // TODO: Call POST /auth/otp/resend
      // const result = await apiClient.post('/auth/otp/resend', {
      //   phone: verificationContext?.phone,
      //   email: verificationContext?.email,
      // });

      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Set cooldown (typically 60 seconds)
      setResendCooldown(60);
      setErrorMessage('');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code?: string }).code;
        
        if (errorCode === 'OTP_RATE_LIMITED') {
          const waitSeconds = (error as { details?: { waitSeconds?: number } }).details
            ?.waitSeconds ?? 3600;
          setResendCooldown(waitSeconds);
          setErrorMessage(
            `Too many requests. Please wait ${Math.ceil(waitSeconds / 60)} minutes.`
          );
        } else {
          setErrorMessage('Failed to resend code. Please try again.');
        }
      } else {
        setErrorMessage('Failed to resend code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!verificationContext) {
    return null;
  }

  const maskedIdentifier =
    verificationContext.verifyVia === 'phone'
      ? verificationContext.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      : verificationContext.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cn-green-100 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-cn-green-700"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-cn-blue-900 mb-2">Verify Your Account</h1>
          <p className="text-cn-blue-600">
            We sent a 6-digit code to{' '}
            <span className="font-semibold">{maskedIdentifier}</span>
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* OTP Input */}
          <div>
            <div className="flex gap-2 justify-center">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-cn-blue-200 rounded-xl focus:border-cn-green-600 focus:ring-4 focus:ring-cn-green-600/25 focus:outline-none transition-all"
                  disabled={isLoading}
                />
              ))}
            </div>
            {remainingAttempts !== null && remainingAttempts <= 3 && remainingAttempts > 0 && (
              <p className="mt-3 text-center text-sm text-amber-600">
                ⚠️ {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'}{' '}
                remaining before lockout
              </p>
            )}
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            className="w-full"
            size="lg"
            disabled={isLoading || code.some((d) => !d)}
          >
            {isLoading ? 'Verifying...' : 'Verify & Continue'}
          </Button>

          {/* Resend */}
          <div className="text-center">
            <p className="text-sm text-cn-blue-600 mb-2">Didn&apos;t receive the code?</p>
            {resendCooldown > 0 ? (
              <p className="text-sm text-cn-blue-500">
                Resend available in {Math.floor(resendCooldown / 60)}:
                {String(resendCooldown % 60).padStart(2, '0')}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="text-sm font-semibold text-cn-green-600 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                Resend Code
              </button>
            )}
          </div>

          {/* Back to Register */}
          <div className="text-center pt-4 border-t border-cn-blue-100">
            <Link
              href="/register"
              className="text-sm text-cn-blue-600 hover:text-cn-blue-900 hover:underline"
            >
              ← Back to Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
