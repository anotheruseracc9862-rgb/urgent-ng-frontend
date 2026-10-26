'use client';

import * as React from 'react';
import { KeyRound } from 'lucide-react';
import { Alert, Button } from '@urgent/ui';
import { useApiMutation } from '@/lib/query/mutations';
import { authApi } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { PasswordInput, describeAuthError } from '@/features/auth/auth-ui';

const MIN = 8;

/** The message for a failed change: the wrong current password gets its own words, everything else the shared ones. */
export function changePasswordError(error: unknown): string {
  if (isApiError(error) && error.code === 'INVALID_CREDENTIALS') return 'Your current password is not right.';
  if (isApiError(error) && error.code === 'VALIDATION_ERROR' && error.details.field === 'newPassword') return error.message;
  return describeAuthError(error);
}

/**
 * Change the password while signed in. It asks for the current one, and the server signs out every other device, which
 * the card says before the person presses the button. An account that signs in with Google has no password to change.
 */
export function ChangePasswordCard() {
  const { me } = useSession();
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [again, setAgain] = React.useState('');
  const change = useApiMutation({
    affects: ['security'],
    mutationFn: () => authApi.changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => { setCurrent(''); setNext(''); setAgain(''); },
  });

  const tooShort = next.length > 0 && next.length < MIN;
  const mismatch = again.length > 0 && again !== next;
  const sameAsOld = next.length > 0 && next === current;
  const ready = current.length > 0 && next.length >= MIN && again === next && !sameAsOld;

  return (
    <section aria-labelledby="change-password-heading" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
      <header className="mb-3 flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-tint-2 text-green-900"><KeyRound className="size-[18px]" /></span>
        <div>
          <h2 id="change-password-heading" className="text-base font-extrabold tracking-tight text-ink">Password</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {me.hasPassword
              ? 'Changing it signs you out of every other device. This one stays signed in.'
              : 'You sign in with Google, so there is no password to change.'}
          </p>
        </div>
      </header>

      {me.hasPassword ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => { event.preventDefault(); if (ready) change.mutate(); }}
          noValidate
        >
          <div className="grid gap-1.5">
            <label htmlFor="current-password" className="text-xs font-bold text-ink-2">Current password</label>
            <PasswordInput id="current-password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="new-password" className="text-xs font-bold text-ink-2">New password</label>
            <PasswordInput id="new-password" autoComplete="new-password" value={next} aria-invalid={tooShort || sameAsOld} onChange={(event) => setNext(event.target.value)} />
            <p className={`text-xs ${tooShort || sameAsOld ? 'text-red' : 'text-muted'}`}>
              {sameAsOld ? 'Choose a password different from your current one.' : `At least ${MIN} characters.`}
            </p>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="confirm-password" className="text-xs font-bold text-ink-2">Confirm new password</label>
            <PasswordInput id="confirm-password" autoComplete="new-password" value={again} aria-invalid={mismatch} onChange={(event) => setAgain(event.target.value)} />
            {mismatch ? <p className="text-xs text-red">The two passwords do not match.</p> : null}
          </div>
          {change.error ? <Alert variant="danger" role="alert">{changePasswordError(change.error)}</Alert> : null}
          {change.isSuccess ? <Alert variant="ok" role="status">Password changed. Your other devices were signed out.</Alert> : null}
          <div>
            <Button type="submit" disabled={!ready || change.isPending}>{change.isPending ? 'Changing…' : 'Change password'}</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
