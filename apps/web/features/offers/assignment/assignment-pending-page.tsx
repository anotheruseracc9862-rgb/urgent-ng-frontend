'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock3, RefreshCw } from 'lucide-react';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '../api';

const money = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

function countdownLabel(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function AcceptanceCountdown({ deadline, dateHeader, onRefresh }: { deadline: string; dateHeader?: string; onRefresh: () => void }) {
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setElapsedMilliseconds((elapsed) => elapsed + 1000), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const serverDate = dateHeader ? Date.parse(dateHeader) : Number.NaN;
  if (!Number.isFinite(serverDate)) {
    return <div className="mt-3"><p className="text-sm text-muted">The server deadline is not available yet.</p><Button className="mt-2" type="button" variant="ghost" onClick={onRefresh}><RefreshCw aria-hidden="true" className="mr-2 size-4" />Refresh deadline</Button></div>;
  }
  const secondsLeft = Math.ceil((Date.parse(deadline) - serverDate - elapsedMilliseconds) / 1000);
  return (
    <div>
      <p className={`mt-3 flex items-center gap-2 text-xl font-extrabold ${secondsLeft <= 60 ? 'text-red' : 'text-ink'}`} aria-live="off">
        <Clock3 aria-hidden="true" className="size-5" />{secondsLeft <= 0 ? 'Deadline reached' : countdownLabel(secondsLeft)}
      </p>
      {secondsLeft <= 0 ? <div className="mt-2"><Alert variant="warn" role="status">The deadline has passed according to the server time. Refresh to confirm whether the assignment has timed out.</Alert><Button className="mt-2" type="button" variant="ghost" onClick={onRefresh}><RefreshCw aria-hidden="true" className="mr-2 size-4" />Refresh status</Button></div> : null}
    </div>
  );
}

export function AssignmentPendingPage({ assignmentId, embedded = false }: { assignmentId: string; embedded?: boolean }) {
  const client = useQueryClient();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const key = queryKeys.assignments.detail(assignmentId);
  const query = useQuery({
    queryKey: key,
    queryFn: () => offersApi.assignment(assignmentId),
  });
  const accept = useApiMutation({ affects: ['assignments'],
    mutationFn: () => offersApi.acceptAssignment(assignmentId, crypto.randomUUID()),
    onSuccess: async () => {
      setNotice('You accepted the assignment. The requester has been notified.');
      await client.invalidateQueries({ queryKey: key });
      await query.refetch();
    },
    onError: async (error) => {
      if (isApiError(error) && error.code === 'ASSIGNMENT_ACCEPTANCE_EXPIRED') {
        setNotice('The acceptance window ended. We refreshed the assignment status.');
        await query.refetch();
      } else if (isApiError(error) && ['ASSIGNMENT_INVALID_STATE', 'ASSIGNMENT_CONFLICT', 'ERRAND_INVALID_STATE'].includes(error.code)) {
        setNotice('The assignment changed before your response. We refreshed the latest status.');
        await query.refetch();
      }
    },
  });
  const decline = useApiMutation({ affects: ['assignments'],
    mutationFn: () => offersApi.declineAssignment(assignmentId),
    onSuccess: async () => {
      setDeclineOpen(false);
      setNotice('You declined the assignment. The errand is available to other runners again.');
      await client.invalidateQueries({ queryKey: key });
      await query.refetch();
    },
    onError: async (error) => {
      if (isApiError(error) && ['ASSIGNMENT_INVALID_STATE', 'ASSIGNMENT_CONFLICT', 'ASSIGNMENT_ACCEPTANCE_EXPIRED'].includes(error.code)) {
        setNotice('The assignment changed before your response. We refreshed the latest status.');
        await query.refetch();
      }
    },
  });

  if (query.isPending) {
    return <PageLoading title="Assignment pending" eyebrow="Offer" width="max-w-4xl" />;
  }
  if (query.error || !query.data) {
    return <main className="mx-auto max-w-4xl"><Link href="/offers" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-green-800 max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />My offers</Link><Alert variant="danger" role="alert">{isApiError(query.error) && query.error.code === 'RESOURCE_NOT_FOUND' ? 'This assignment could not be found, or you do not have permission to view it.' : 'We could not load this assignment.'}</Alert><Button className="mt-3" type="button" variant="ghost" onClick={() => void query.refetch()}><RefreshCw aria-hidden="true" className="mr-2 size-4" />Try again</Button></main>;
  }

  const assignment = query.data.data;
  const pending = assignment.status === 'PENDING_ACCEPTANCE';
  const isRunner = assignment.role === 'RUNNER';
  const expired = assignment.status === 'TIMED_OUT';
  const windowMinutes = Math.max(1, Math.round((Date.parse(assignment.acceptanceDeadline) - Date.parse(assignment.selectedAt)) / 60_000));

  return (
    <section className="grid gap-4">
      {!embedded ? <>
      <Link href="/offers" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-green-800 hover:underline max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />My offers</Link>
      <header className="rounded-[var(--r-lg)] border border-line bg-tint p-4 shadow-[var(--shadow)] sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Assignment · Runner response</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">{assignment.errand.title}</h1>
        <p className="mt-2 text-sm text-muted">Agreed runner fee: <strong className="text-ink">{money(assignment.agreedAmountMinor)}</strong></p>
      </header>
      </> : null}

      {notice ? <Alert role="status">{notice}</Alert> : null}
      {accept.error && !isApiError(accept.error) ? <Alert variant="danger" role="alert">{accept.error.message}</Alert> : null}
      {decline.error && !isApiError(decline.error) ? <Alert variant="danger" role="alert">{decline.error.message}</Alert> : null}

      {pending && !expired ? (
        <section className="grid gap-4 rounded-[var(--r-lg)] bg-tint p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-green-900">Selected at {money(assignment.agreedAmountMinor)}</span>
            <span className="rounded-full bg-amber-bg px-3 py-1 text-[11px] font-extrabold text-amber">Awaiting acceptance</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="text-base font-extrabold text-ink">{isRunner ? 'Your response is needed' : 'Waiting for the runner to accept'}</h2>
            <p className="mt-1 text-sm text-muted">The acceptance window ends {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(assignment.acceptanceDeadline))} (Lagos time).</p>
            <AcceptanceCountdown
              key={query.data.dateHeader ?? assignment.acceptanceDeadline}
              deadline={assignment.acceptanceDeadline}
              dateHeader={query.data.dateHeader}
              onRefresh={() => void query.refetch()}
            />
          </div>
          {isRunner ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={accept.isPending || decline.isPending} onClick={() => accept.mutate()}>{accept.isPending ? 'Accepting…' : 'Accept assignment'}</Button>
              <Button type="button" variant="ghost" disabled={accept.isPending || decline.isPending} onClick={() => setDeclineOpen(true)}>Decline</Button>
            </div>
          ) : null}
          </div>
          <div className="grid gap-2 rounded-[var(--r-sm)] bg-surface/70 p-3 text-xs leading-relaxed text-ink-2 sm:grid-cols-2">
            <div>
              <p className="font-extrabold text-ink">If there is no answer</p>
              <p className="mt-1">After {windowMinutes} minutes the selection times out. The offer closes for good and the errand reopens with the same deadline.</p>
            </div>
            <div>
              <p className="font-extrabold text-ink">{isRunner ? 'What the requester sees' : 'What you can do meanwhile'}</p>
              <p className="mt-1">{isRunner ? 'The errand shows "Runner selected". Other offers stay open until you accept.' : 'Other offers stay open until the runner accepts. You can cancel now with no penalty.'}</p>
            </div>
          </div>
        </section>
      ) : null}

      {expired ? (
        <Alert variant="warn" role="status">
          <p className="font-extrabold">Acceptance window ended</p>
          <p className="mt-1">The runner did not accept in time. {assignment.errand.status === 'OPEN' ? 'The errand has reopened and can receive new offers.' : 'The errand status has been updated.'}</p>
          {assignment.errand.status === 'OPEN' ? <Button asChild variant="ghost" size="sm" className="mt-3"><Link href="/marketplace">Browse open errands</Link></Button> : null}
        </Alert>
      ) : null}
      {assignment.status === 'DECLINED' ? <Alert variant="info" role="status"><p className="font-extrabold">Assignment declined</p><p className="mt-1">The errand has reopened for other runners.</p><Button asChild variant="ghost" size="sm" className="mt-3"><Link href="/marketplace">Browse open errands</Link></Button></Alert> : null}
      {assignment.status === 'ACCEPTED' ? <Alert role="status"><p className="font-extrabold">Assignment accepted</p><p className="mt-1">The requester and runner can now coordinate the errand.</p></Alert> : null}
      {!pending && !expired && assignment.status !== 'DECLINED' && assignment.status !== 'ACCEPTED' ? <Alert role="status">Assignment status: {assignment.status.toLowerCase().replaceAll('_', ' ')}.</Alert> : null}

      <Dialog open={declineOpen} onOpenChange={(open) => { if (!open && !decline.isPending) setDeclineOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this assignment?</DialogTitle>
            <DialogDescription>Declining is final. The errand will reopen for other runners, or expire if its posting deadline has passed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={decline.isPending} onClick={() => setDeclineOpen(false)}>Keep assignment</Button>
            <Button type="button" variant="danger" disabled={decline.isPending} onClick={() => decline.mutate()}>{decline.isPending ? 'Declining…' : 'Confirm decline'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
