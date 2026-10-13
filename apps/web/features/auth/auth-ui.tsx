'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Alert, Input, type InputProps, cn } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';

/** Turns a backend error into the copy a person should read. */
export function describeAuthError(error: unknown): string {
  if (!isApiError(error)) return 'Something went wrong. Please try again.';
  const wait = error.retryAfterSeconds;
  const minutes = wait ? Math.max(1, Math.ceil(wait / 60)) : undefined;

  switch (error.code) {
    case 'NETWORK_ERROR':
      return error.message;
    case 'INVALID_CREDENTIALS':
      return 'That phone, email or password is not right. Check it and try again.';
    case 'ACCOUNT_LOCKED':
      return minutes
        ? `Too many wrong attempts. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
        : 'Too many wrong attempts. Try again later.';
    case 'ACCOUNT_SUSPENDED':
      return 'This account is suspended. Contact support if you think this is a mistake.';
    case 'OTP_INVALID': {
      const left = error.details.remainingAttempts;
      return typeof left === 'number' && left > 0
        ? `That code is not right. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`
        : 'That code is not right.';
    }
    case 'OTP_EXPIRED':
      return 'That code has expired. Ask for a new one.';
    case 'OTP_RATE_LIMITED':
      return minutes
        ? `Too many codes or attempts. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
        : 'Too many codes or attempts. Try again later.';
    case 'OTP_DELIVERY_FAILED':
      return 'We could not send the code. Check the number or email and try again.';
    case 'IDENTIFIER_TAKEN':
      return 'An account with this phone or email already exists. Sign in instead.';
    case 'REGISTRATION_BLOCKED':
      return 'We cannot create an account with these details.';
    case 'FEATURE_DISABLED':
      return 'Sign-up is paused right now. Please try again later.';
    case 'RATE_LIMITED':
      return 'Too many requests. Wait a moment and try again.';
    case 'VALIDATION_ERROR': {
      const first = error.fieldMessages[0];
      return first ?? error.message;
    }
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="danger" role="alert">
      {message}
    </Alert>
  );
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-semibold text-red">
      {message}
    </p>
  );
}

export function AuthHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">{title}</h1>
      {children ? <p className="mt-1.5 text-muted">{children}</p> : null}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-bold text-faint">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-12', className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink"
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

/** 6-box one-time-code input with paste and backspace handling. */
export function OtpBoxes({
  value,
  onChange,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  const setAt = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) {
      const next = digits.slice();
      next[index] = '';
      onChange(next.join(''));
      return;
    }
    const next = digits.slice();
    clean
      .slice(0, 6 - index)
      .split('')
      .forEach((d, i) => {
        next[index + i] = d;
      });
    onChange(next.join(''));
    refs.current[Math.min(index + clean.length, 5)]?.focus();
  };

  return (
    <div className="grid grid-cols-6 gap-2.5" role="group" aria-label="6-digit code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onChange={(e) => setAt(index, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus();
          }}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            'h-[58px] min-w-0 rounded-[var(--r-sm)] border border-line bg-surface text-center text-[22px] font-extrabold',
            'focus:border-lime-600 focus:shadow-[0_0_0_4px_rgba(166,212,69,.25)] focus:outline-none',
            invalid && 'border-[#e4574a]',
          )}
        />
      ))}
    </div>
  );
}

