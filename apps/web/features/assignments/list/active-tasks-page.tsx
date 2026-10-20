'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, MessageCircle } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { PageHead } from '@/components/shell/page-head';
import { useSession } from '@/lib/auth/client';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import { assignmentQueries, type RunnerTask } from '../queries';
import { ExecutionProgress, RouteBlock, stageBadge } from '../execution-progress';
import { availableActions } from '../available-actions';


function useAssignments(status: 'ACTIVE' | 'PENDING_ACCEPTANCE', userId: string) {
  const polling = useLivePolling(30_000);
  return useQuery({ ...assignmentQueries.runnerTasks(userId, status), refetchInterval: polling });
}

const formatMoney = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
const chip = 'inline-flex min-h-9 items-center rounded-full bg-panel px-3.5 text-xs font-extrabold text-ink-2 hover:bg-tint-2';
const lagosTime = (iso: string) =>
  new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' }).format(new Date(iso));

export function TaskRow({ assignment, respond }: { assignment: RunnerTask; respond?: boolean }) {
  const id = encodeURIComponent(assignment.id);
  const badge = stageBadge(assignment.errandStatus, Boolean(respond));
  const can = availableActions('RUNNER', assignment.status, assignment.errandStatus);
  return (
    <li className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badge.className}`}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{badge.label}
        </span>
        <span className="text-xl font-extrabold tabular-nums tracking-tight text-ink">{formatMoney(assignment.agreedAmountMinor)}</span>
      </div>
      <h3 className="mt-3 break-words text-lg font-extrabold leading-snug tracking-tight text-ink">
        <Link href={`/assignments/${id}`} className="hover:underline">{assignment.errandTitle}</Link>
      </h3>
      <p className="mt-1 text-sm text-muted">
        Requester: {assignment.requesterFirstName} · Agreed {formatMoney(assignment.agreedAmountMinor)} · paid directly
      </p>
      {respond ? null : <ExecutionProgress errandStatus={assignment.errandStatus} className="mt-4" />}
      <div className="mt-4"><RouteBlock from={assignment.pickupArea} to={assignment.destinationArea} /></div>
      {respond ? <p className="mt-3 text-xs font-bold text-amber">Accept before {lagosTime(assignment.acceptanceDeadline)} (Lagos time) or it goes back to the requester.</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {respond ? (
          <Link href={`/assignments/${id}`} className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-extrabold text-white">Respond</Link>
        ) : (
          <>
            {can.continueErrand ? <Link href={`/assignments/${id}/run`} className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-extrabold text-white">Update progress</Link> : null}
            <Link href={`/assignments/${id}`} className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-extrabold ${can.continueErrand ? 'border border-line text-ink hover:bg-panel' : 'bg-ink text-white'}`}>Open task</Link>
          </>
        )}
        {assignment.conversationId && !respond ? (
          <Link href={`/messages/${encodeURIComponent(assignment.conversationId)}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-extrabold text-ink hover:bg-panel">
            <MessageCircle aria-hidden="true" className="size-4" />Message
          </Link>
        ) : null}
      </div>
      {respond || !(can.paymentTerms || can.changeRequest || can.dispute || can.cancel) ? null : (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line-2 pt-4">
          {can.paymentTerms ? <Link href={`/assignments/${id}/payment`} className={chip}>Payment terms</Link> : null}
          {can.changeRequest ? <Link href={`/assignments/${id}/changes`} className={chip}>Change request</Link> : null}
          {can.dispute ? <Link href={`/assignments/${id}/dispute`} className={chip}>Open a dispute</Link> : null}
          {can.cancel ? <Link href={`/assignments/${id}/cancel`} className="inline-flex min-h-9 items-center rounded-full bg-red-bg px-3.5 text-xs font-extrabold text-red hover:opacity-80">Cancel</Link> : null}
        </div>
      )}
    </li>
  );
}

/** The runner's current work: tasks waiting for an answer, then tasks in progress. */
export function ActiveTasksPage() {
  const { me } = useSession();
  const pending = useAssignments('PENDING_ACCEPTANCE', me.id);
  const active = useAssignments('ACTIVE', me.id);
  const loading = pending.isPending || active.isPending;
  const error = pending.error ?? active.error;
  const waiting = pending.data ?? [];
  const running = active.data ?? [];

  return (
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Runner"
        title="Your active tasks"
        description="A shared view of the agreed errand, its milestones and safety information."
      />

      {error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load your tasks.</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => { void pending.refetch(); void active.refetch(); }}>Try again</Button>
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid gap-4" role="status" aria-label="Loading tasks" aria-busy="true">
          {[0, 1].map((item) => (
            <div key={item} className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-[13px]" />
                  <div className="grid min-w-0 flex-1 gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : !error && !waiting.length && !running.length ? (
        <section className="grid justify-items-center gap-2.5 rounded-[var(--r-lg)] bg-surface px-5 py-10 text-center shadow-[var(--shadow)]" role="status">
          <span aria-hidden="true" className="grid size-14 place-items-center rounded-[18px] bg-panel text-muted"><BriefcaseBusiness className="size-6" /></span>
          <h2 className="text-sm font-extrabold text-ink">No active tasks right now</h2>
          <p className="mt-1 text-sm text-muted">Browse nearby errands and send an offer to get your next job.</p>
          <Link href="/marketplace" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white">Find errands</Link>
        </section>
      ) : (
        <>
          {waiting.length ? (
            <section aria-labelledby="waiting-heading" className="grid min-w-0 gap-3">
              <h2 id="waiting-heading" className="text-xs font-extrabold uppercase tracking-wide text-muted">Waiting for your answer</h2>
              <ul className="grid gap-3">{waiting.map((item) => <TaskRow key={item.id} assignment={item} respond />)}</ul>
            </section>
          ) : null}
          {running.length ? (
            <section aria-labelledby="running-heading" className="grid min-w-0 gap-3">
              <h2 id="running-heading" className="text-xs font-extrabold uppercase tracking-wide text-muted">In progress</h2>
              <ul className="grid gap-3">{running.map((item) => <TaskRow key={item.id} assignment={item} />)}</ul>
            </section>
          ) : null}
        </>
      )}

      <p className="text-xs text-muted">
        Finished work is in <Link href="/runner/history" className="font-bold text-green-800 underline">Job history</Link>.
      </p>
    </div>
  );
}
