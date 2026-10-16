'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, UserRoundCheck, UserRoundX } from 'lucide-react';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Textarea } from '@urgent/ui';
import { PageHead } from '@/components/shell/page-head';
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
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Account"
        title="Deactivate or delete account"
        description="Deactivation is reversible. Deletion starts a 14-day grace period."
      />

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

      <div className="grid items-start gap-4 md:grid-cols-2">
        <section aria-labelledby="deactivate-account-heading" className="grid min-w-0 content-start gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <header className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-blue-bg text-blue">
              <UserRoundCheck className="size-[18px]" />
            </span>
            <div>
              <h2 id="deactivate-account-heading" className="text-base font-extrabold tracking-tight text-ink">Deactivate</h2>
              <p className="mt-1 text-xs leading-5 text-muted">A reversible pause to your account.</p>
            </div>
          </header>
          <ul className="grid gap-2">
            {[
              'Your profile is hidden and you cannot post errands or make offers.',
              'Sign in any time to reactivate your account.',
              'Your history is kept.',
            ].map((item) => (
              <li key={item} className="rounded-[var(--r-sm)] bg-panel px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">{item}</li>
            ))}
          </ul>
          <Button className="w-full sm:w-fit" variant="ghost" onClick={() => { setError(undefined); setDialog('deactivate'); }}>Deactivate account</Button>
        </section>

        <section aria-labelledby="delete-account-heading" className="grid min-w-0 content-start gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <header className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-red-bg text-red">
              <UserRoundX className="size-[18px]" />
            </span>
            <div>
              <h2 id="delete-account-heading" className="text-base font-extrabold tracking-tight text-ink">Delete</h2>
              <p className="mt-1 text-xs leading-5 text-muted">Deletion is permanent after the grace period.</p>
            </div>
          </header>
          <ul className="grid gap-2">
            {[
              'Deletion is scheduled 14 days from your request.',
              'Sign in during the grace period to cancel.',
              'Your personal data is removed after the grace period; ratings and safety records may be retained.',
            ].map((item) => (
              <li key={item} className="rounded-[var(--r-sm)] bg-panel px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">{item}</li>
            ))}
          </ul>
          <div className="rounded-[var(--r-sm)] bg-red-bg/60 px-3 py-2.5 text-xs leading-relaxed text-red">
            <p className="flex items-start gap-2"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />You may lose access to your account and personal data after the grace period.</p>
          </div>
          <Button className="w-full sm:w-fit" variant="danger" onClick={() => { setError(undefined); setDialog('delete'); }}>Delete account</Button>
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
