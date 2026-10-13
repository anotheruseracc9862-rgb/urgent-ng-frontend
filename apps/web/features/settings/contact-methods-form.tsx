'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Input, Label } from '@urgent/ui';
import { isValidPhone, normalizePhone } from '@urgent/utils';
import { authApi, type Identifier } from '@/lib/api/auth';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { OtpBoxes, PasswordInput, describeAuthError } from '@/features/auth/auth-ui';
import { GoogleConfirm } from '@/features/auth/google-confirm';

type Kind = 'phone' | 'email';
type Step = 'enter' | 'code';

const COPY: Record<Kind, { title: string; add: string; change: string; placeholder: string; input: string }> = {
  phone: { title: 'Phone number', add: 'Add phone', change: 'Change', placeholder: '0803 123 4567', input: 'tel' },
  email: { title: 'Email', add: 'Add email', change: 'Change', placeholder: 'you@email.com', input: 'email' },
};

function toIdentifier(kind: Kind, raw: string): Identifier | null {
  const value = raw.trim();
  if (kind === 'phone') {
    if (!isValidPhone(value)) return null;
    return { phone: normalizePhone(value) ?? value };
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { email: value.toLowerCase() } : null;
}

/**
 * Add or change the phone number and email of this account (one account, several ways to sign in).
 * The new value gets a code; nothing changes until the code is confirmed.
 */
export function ContactMethodsForm() {
  const { me } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState<Kind | null>(null);
  const [step, setStep] = React.useState<Step>('enter');
  const [value, setValue] = React.useState('');
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
      setError(kind === 'phone' ? 'Enter a valid Nigerian phone number.' : 'Enter a valid email address.');
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me(me.id) });
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

      {rows.map(({ kind, current, verified }) => {
        const copy = COPY[kind];
        const isEditing = editing === kind;
        return (
          <section key={kind} className="rounded-[var(--r-lg)] border border-line bg-surface p-5 shadow-[var(--shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-ink">{copy.title}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span className="truncate">{current ?? 'Not added'}</span>
                  {current ? (
                    <Badge variant={verified ? 'green' : 'amber'}>{verified ? 'Verified' : 'Not verified'}</Badge>
                  ) : null}
                </p>
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
                  }}
                >
                  {current ? copy.change : copy.add}
                </Button>
              ) : null}
            </div>

            {isEditing ? (
              <div className="mt-4 grid gap-3 border-t border-line pt-4">
                {error ? (
                  <Alert variant="danger" role="alert">
                    {error}
                  </Alert>
                ) : null}

                {step === 'enter' ? (
                  <>
                    <div>
                      <Label htmlFor={`new-${kind}`}>{current ? `New ${copy.title.toLowerCase()}` : copy.title}</Label>
                      <Input
                        id={`new-${kind}`}
                        className="mt-1.5"
                        type={copy.input}
                        inputMode={kind === 'phone' ? 'tel' : 'email'}
                        autoComplete={kind === 'phone' ? 'tel' : 'email'}
                        placeholder={copy.placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
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
                      <Button type="button" disabled={busy} onClick={() => void sendCode(kind)}>
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

      <p className="text-xs text-muted">
        One account, several ways to sign in. A verified phone or email can be used to log in, and you keep a
        single profile for both Requester and Runner modes.
      </p>
    </div>
  );
}
