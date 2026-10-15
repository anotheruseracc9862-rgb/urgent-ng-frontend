'use client';

import { useEffect, useMemo, useState } from 'react';
import { setPendingIdentifier, setPendingVerify, type PendingVerify } from '@/lib/auth/pending-identity';
import { usePendingVerify } from '@/lib/auth/use-pending-identity';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { Button } from '@urgent/ui';
import { authApi, type Identifier } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { AuthHeading, FormError, OtpBoxes, describeAuthError } from './auth-ui';

function mask(ctx: PendingVerify): string {
  if (ctx.via === 'email' && ctx.email) return ctx.email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
  const phone = ctx.phone ?? '';
  return phone.length > 7 ? `${phone.slice(0, 4)}****${phone.slice(-3)}` : phone;
}

export function VerifyOtpForm() {
  const router = useRouter();
  const raw = usePendingVerify();
  const ctx = raw ?? null;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (raw === null) router.replace('/register');
  }, [raw, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const identifier = useMemo<Identifier | null>(() => {
    if (!ctx) return null;
    if (ctx.via === 'phone' && ctx.phone) return { phone: ctx.phone };
    if (ctx.email) return { email: ctx.email };
    return ctx.phone ? { phone: ctx.phone } : null;
  }, [ctx]);

  if (!ctx || !identifier) return null;

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    setInvalid(false);
    try {
      await authApi.verifyOtp({ ...identifier, code: value });
      setPendingVerify(null);
      setPendingIdentifier('email' in identifier ? identifier.email : identifier.phone);
      router.replace('/login?verified=1');
    } catch (e) {
      setInvalid(true);
      setError(describeAuthError(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError('');
    try {
      await authApi.resendOtp(identifier);
      setNotice('A new code is on its way.');
      setCooldown(60);
    } catch (e) {
      setError(describeAuthError(e));
      if (isApiError(e) && e.retryAfterSeconds) setCooldown(Math.min(e.retryAfterSeconds, 3600));
    } finally {
      setBusy(false);
    }
  };

  const mm = String(Math.floor(cooldown / 60));
  const ss = String(cooldown % 60).padStart(2, '0');

  return (
    <>
      <div className="flex gap-1.5" role="img" aria-label="Step 2 of 3">
        <i className="h-[5px] flex-1 rounded-full bg-lime-600" />
        <i className="h-[5px] flex-1 rounded-full bg-lime-600" />
        <i className="h-[5px] flex-1 rounded-full bg-line" />
      </div>

      <AuthHeading title={ctx.via === 'email' ? 'Verify your email' : 'Verify your phone'}>
        We sent a 6-digit code to <b className="text-ink">{mask(ctx)}</b>.
      </AuthHeading>

      <FormError message={error} />
      {notice ? (
        <p role="status" className="text-[13px] font-semibold text-green-700">
          {notice}
        </p>
      ) : null}

      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
      >
        <OtpBoxes
          value={code}
          onChange={(next) => {
            setCode(next);
            setInvalid(false);
            if (next.length === 6) void verify(next);
          }}
          disabled={busy}
          invalid={invalid}
        />

        <div className="flex items-center justify-between text-[13px]">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Clock className="size-4" />
            {cooldown > 0 ? `Resend in ${mm}:${ss}` : 'Did not get it?'}
          </span>
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || busy}
            className="font-bold text-green-700 hover:underline disabled:cursor-not-allowed disabled:text-faint disabled:no-underline"
          >
            Resend code
          </button>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>
          {busy ? 'Verifying…' : 'Verify and continue'}
        </Button>
        <p className="text-center text-xs text-muted">Never share this code with anyone.</p>
      </form>

      <div className="border-t border-line pt-4 text-center text-[13px]">
        <Link href="/register" className="font-semibold text-muted hover:text-ink hover:underline">
          Use a different number or email
        </Link>
      </div>
    </>
  );
}
