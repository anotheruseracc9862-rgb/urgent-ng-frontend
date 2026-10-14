'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Textarea } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import type { AccountChange, Me } from '@/lib/api/types';
import { authApi } from '@/lib/api/auth';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';

type Blocker = { code: string; message: string; href: string; action: string };

function blockersFrom(error: unknown): Blocker[] {
  if (!isApiError(error) || error.code !== 'DELETION_BLOCKED') return [];
  const raw = error.details.blockers;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): Blocker[] => {
    if (!item || typeof item !== 'object' || !('code' in item) || !('message' in item)) return [];
    const { code, message } = item;
    if (typeof code !== 'string' || typeof message !== 'string') return [];
    if (code.includes('ASSIGNMENT') || code.includes('ERRAND')) return [{ code, message, href: '/dashboard', action: 'View errands' }];
    if (code.includes('DISPUTE') || code.includes('REPORT')) return [{ code, message, href: '/help', action: 'Get support' }];
    if (code.includes('ORDER') || code.includes('PAYMENT')) return [{ code, message, href: '/settings', action: 'Review account settings' }];
    return [{ code, message, href: '/help', action: 'Get support' }];
  });
}

function updateMe(queryClient: ReturnType<typeof useQueryClient>, me: Me, result: AccountChange) {
  queryClient.setQueryData<Me>(queryKeys.auth.me(me.id), (current) => current
    ? { ...current, status: result.status, deletionScheduledAt: result.deletionScheduledAt ?? null }
    : current);
}

function errorText(error: unknown): string {
  if (isApiError(error) && error.code === 'RESOURCE_CONFLICT') return 'This account state has changed. Refresh and try again.';
  if (isApiError(error) && error.requestId) return `We could not update your account. Request ID: ${error.requestId}`;
  return 'We could not update your account. Please try again.';
}

export function AccountLifecyclePage() {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [dialog, setDialog] = useState<'deactivate' | 'delete' | null>(null);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const blockers = blockersFrom(error);

  const transition = async (action: 'deactivate' | 'delete') => {
    setBusy(true);
    setError(undefined);
    try {
      const result = action === 'deactivate'
        ? await authApi.deactivate(reason.trim() || undefined)
        : await authApi.requestDeletion(reason.trim() || undefined);
      updateMe(queryClient, me, result);
      setDialog(null);
      router.replace('/account/standing');
      router.refresh();
    } catch (cause) {
      setError(cause);
      setDialog(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Account</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Deactivate or delete account</h1>
        <p className="mt-1 text-sm text-muted">Deactivation is reversible. Deletion starts a 14-day grace period.</p>
      </header>

      {error ? (
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>{errorText(error)}</p>
            {blockers.length ? (
              <ul className="grid gap-2">
                {blockers.map((blocker, index) => (
                  <li key={`${blocker.code}-${index}`} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{blocker.message}</span>
                    <Link href={blocker.href} className="font-bold underline">{blocker.action}</Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-5 shadow-[var(--shadow)]">
          <h2 className="text-base font-extrabold text-ink">Deactivate</h2>
          <ul className="mt-4 grid gap-3 text-sm text-muted">
            <li>Profile hidden; no new offers or errands.</li>
            <li>Sign in any time to reactivate.</li>
            <li>Your history is kept.</li>
          </ul>
          <Button className="mt-5" variant="ghost" onClick={() => { setError(undefined); setDialog('deactivate'); }}>Deactivate account</Button>
        </section>

        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-5 shadow-[var(--shadow)]">
          <h2 className="text-base font-extrabold text-ink">Delete</h2>
          <ul className="mt-4 grid gap-3 text-sm text-muted">
            <li>Deletion is scheduled 14 days from your request.</li>
            <li>Sign in during the grace period to cancel.</li>
            <li>Your personal data is removed after the grace period; ratings and safety records may be retained.</li>
          </ul>
          <Button className="mt-5" variant="danger" onClick={() => { setError(undefined); setDialog('delete'); }}>Delete account</Button>
        </section>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open && !busy) setDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === 'delete' ? 'Request account deletion?' : 'Deactivate your account?'}</DialogTitle>
            <DialogDescription>
              {dialog === 'delete'
                ? 'Your account will be scheduled for deletion after a 14-day grace period. You can cancel by signing back in during that period.'
                : 'Your profile will be hidden and marketplace actions paused. You can sign in again to reactivate.'}
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="account-change-reason">
            Reason <span className="font-normal text-muted">Optional</span>
            <Textarea id="account-change-reason" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
            <span className="text-right text-xs font-normal text-muted">{reason.length}/500</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setDialog(null)}>Cancel</Button>
            <Button type="button" variant={dialog === 'delete' ? 'danger' : 'primary'} disabled={busy} onClick={() => void transition(dialog ?? 'deactivate')}>
              {busy ? 'Updating…' : dialog === 'delete' ? 'Request deletion' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
