'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Phone } from 'lucide-react';
import { Alert, Badge, Button, Input, Label } from '@urgent/ui';
import { LOCAL_PHONE_ERROR, e164ToLocalPhone, localPhoneToE164 } from '@urgent/utils';
import { authApi, type Identifier } from '@/lib/api/auth';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { OtpBoxes, PasswordInput, describeAuthError } from '@/features/auth/auth-ui';
import { GoogleConfirm } from '@/features/auth/google-confirm';

type Kind = 'phone' | 'email';
type Step = 'enter' | 'code';

const PHONE_ERROR = LOCAL_PHONE_ERROR;

const COPY: Record<Kind, { title: string; add: string; change: string; placeholder: string; input: string }> = {
  phone: { title: 'Phone number', add: 'Add phone', change: 'Change', placeholder: '08031234567', input: 'tel' },
  email: { title: 'Email', add: 'Add email', change: 'Change', placeholder: 'you@email.com', input: 'email' },
};

function toIdentifier(kind: Kind, raw: string): Identifier | null {
  const value = raw.trim();
  if (kind === 'phone') {
    const phone = localPhoneToE164(value);
    return phone ? { phone } : null;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { email: value.toLowerCase() } : null;
}

/**
 * Add or change the phone number and email of this account (one account, several ways to sign in).
 * The new value gets a code; nothing changes until the code is confirmed.
 */
export function ContactMethodsForm({ phoneOnly = false }: { phoneOnly?: boolean }) {
  const { me } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState<Kind | null>(phoneOnly ? 'phone' : null);
  const [step, setStep] = React.useState<Step>('enter');
  const [value, setValue] = React.useState(phoneOnly ? e164ToLocalPhone(me.phone ?? '') : '');
  const [password, setPassword] = React.useState('');
  const [googleToken, setGoogleToken] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [sentTo, setSentTo] = React.useState('');
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const reset = () => {
    setEditing(null);
    setStep('enter');
    setValue('');
    setPassword('');
    setGoogleToken(null);
    setCode('');
    setSentTo('');
    setError('');
  };

  const rows: Array<{ kind: Kind; current: string | null; verified: boolean }> = [
    { kind: 'phone', current: me.phone, verified: me.phoneVerified },
    { kind: 'email', current: me.email, verified: me.emailVerified },
  ];

  const sendCode = async (kind: Kind) => {
    setError('');
    const identifier = toIdentifier(kind, value);
    if (!identifier) {
      setError(kind === 'phone' ? PHONE_ERROR : 'Enter a valid email address.');
      return;
    }
    if (me.hasPassword ? password.length === 0 : !googleToken) {
      setError(me.hasPassword ? 'Enter your password to confirm.' : 'Confirm with your Google account first.');
      return;
    }
    setBusy(true);
    try {
      const proof = me.hasPassword ? { currentPassword: password } : { googleIdToken: googleToken as string };
      const result = await authApi.requestContact({ ...identifier, ...proof });
      setSentTo(result.sentTo);
      setStep('code');
    } catch (e) {
      setError(describeAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (kind: Kind, next: string) => {
    const identifier = toIdentifier(kind, value);
    if (!identifier || next.length !== 6 || busy) return;
    setBusy(true);
    setError('');
    try {
      await authApi.verifyContact({ ...identifier, code: next });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me(me.id) }),
        ...(kind === 'phone' ? [
          queryClient.invalidateQueries({ queryKey: queryKeys.runner.verification() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.runner.eligibility() }),
        ] : []),
      ]);
      setNotice(kind === 'phone' ? 'Your phone number is saved and verified.' : 'Your email is saved and verified.');
      reset();
      router.refresh();
    } catch (e) {
      setError(describeAuthError(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      {notice ? <Alert variant="ok">{notice}</Alert> : null}

      {rows.filter(({ kind }) => !phoneOnly || kind === 'phone').map(({ kind, current, verified }) => {
        const copy = COPY[kind];
        const Icon = kind === 'phone' ? Phone : Mail;
        const isEditing = editing === kind;
        return (
          <section key={kind} className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-[13px] ${kind === 'phone' ? 'bg-tint-2 text-green-900' : 'bg-blue-bg text-blue'}`}>
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold text-ink">{copy.title}</h2>
                  <p className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted">
                    <span className="break-all">{current ?? 'Not added'}</span>
                    {current ? (
                      <Badge variant={verified ? 'green' : 'amber'}>{verified ? 'Verified' : 'Not verified'}</Badge>
                    ) : null}
                  </p>
                </div>
              </div>
              {!isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    reset();
                    setNotice('');
                    setEditing(kind);
                    if (phoneOnly) setValue(current?.replace(/^\+234/, '0') ?? '');
                  }}
                >
                  {phoneOnly ? 'Verify phone' : current ? copy.change : copy.add}
                </Button>
              ) : null}
            </div>

            {isEditing ? (
              <div className="mt-4 grid gap-3 border-t border-line-2 pt-4">
                {error ? (
                  <Alert id={`contact-${kind}-error`} variant="danger" role="alert">
                    {error}
                  </Alert>
                ) : null}

                {step === 'enter' ? (
                  <>
                    <div>
                      <Label htmlFor={`new-${kind}`}>{current && !phoneOnly ? `New ${copy.title.toLowerCase()}` : copy.title}</Label>
                      <Input
                        id={`new-${kind}`}
                        className="mt-1.5"
                        type={copy.input}
                        inputMode={kind === 'phone' ? 'tel' : 'email'}
                        autoComplete={kind === 'phone' ? 'tel' : 'email'}
                        aria-describedby={error ? `contact-${kind}-error` : undefined}
                        aria-invalid={kind === 'phone' && error === PHONE_ERROR || undefined}
                        placeholder={copy.placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onBlur={() => {
                          if (kind !== 'phone') return;
                          if (!toIdentifier(kind, value)) setError(PHONE_ERROR);
                          else setError((current) => current === PHONE_ERROR ? '' : current);
                        }}
                      />
                    </div>
                    {me.hasPassword ? (
                      <div>
                        <Label htmlFor={`proof-${kind}`}>Your password</Label>
                        <PasswordInput
                          id={`proof-${kind}`}
                          className="mt-1.5"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <p className="text-sm text-muted">
                          This account signs in with Google and has no password. Confirm with Google to continue.
                        </p>
                        {googleToken ? (
                          <Badge variant="green">Confirmed with Google</Badge>
                        ) : (
                          <GoogleConfirm onToken={setGoogleToken} />
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" disabled={busy || (me.hasPassword ? password.length === 0 : !googleToken)} onClick={() => void sendCode(kind)}>
                        {busy ? 'Sending…' : 'Send code'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={reset}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">Enter the 6-digit code we sent to {sentTo}.</p>
                    <OtpBoxes
                      value={code}
                      onChange={(next) => {
                        setCode(next);
                        if (next.length === 6) void confirm(kind, next);
                      }}
                      disabled={busy}
                      invalid={Boolean(error)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setStep('enter');
                          setCode('');
                          setError('');
                        }}
                      >
                        Back
                      </Button>
                      <Button type="button" variant="ghost" onClick={reset}>
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </section>
        );
      })}

      {!phoneOnly && <p className="rounded-[var(--r-lg)] bg-panel px-4 py-3 text-xs leading-relaxed text-muted sm:px-5">
        One account, several ways to sign in. A verified phone or email can be used to log in, and you keep a
        single profile for both Requester and Runner modes.
      </p>}
    </div>
  );
}
