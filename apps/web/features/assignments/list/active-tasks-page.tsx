'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MapPin } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatMoney } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import { assignmentQueries, type RunnerTask } from '../queries';


function useAssignments(status: 'ACTIVE' | 'PENDING_ACCEPTANCE', userId: string) {
  const polling = useLivePolling(30_000);
  return useQuery({ ...assignmentQueries.runnerTasks(userId, status), refetchInterval: polling });
}

function TaskRow({ assignment, respond }: { assignment: RunnerTask; respond?: boolean }) {
  return (
    <li>
      <Link
        href={`/assignments/${encodeURIComponent(assignment.id)}`}
        className="block rounded-[var(--r)] border border-line bg-surface p-4 shadow-[var(--shadow)] transition-colors hover:border-lime-600"
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-blue-bg px-2.5 py-1 text-[10px] font-bold text-blue">
            {respond ? 'WAITING FOR YOUR ANSWER' : assignment.errandStatus.replaceAll('_', ' ')}
          </span>
          <span className="text-[13px] font-extrabold text-ink">{formatMoney(assignment.agreedAmountMinor)}</span>
        </span>
        <strong className="mt-3 block text-sm leading-snug text-ink">{assignment.errandTitle}</strong>
        <span className="mt-2 flex items-center gap-2 text-xs text-muted">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">
            {assignment.pickupArea ?? 'Pickup area not shared'}{assignment.destinationArea ? ` → ${assignment.destinationArea}` : ''}
          </span>
        </span>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-green-800">
          {respond ? 'Respond' : 'Open task'} <ChevronRight aria-hidden="true" className="size-3.5" />
        </span>
      </Link>
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
    <div className="mx-auto grid max-w-3xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Runner</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Active task</h1>
        <p className="mt-1 text-sm text-muted">Keep the requester updated as each task moves along.</p>
      </header>

      {error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load your tasks.</p>
          {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => { void pending.refetch(); void active.refetch(); }}>Try again</Button>
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid gap-3" aria-label="Loading tasks"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : !error && !waiting.length && !running.length ? (
        <section className="rounded-[var(--r-lg)] border border-dashed border-line bg-panel/60 p-8 text-center">
          <h2 className="text-sm font-extrabold text-ink">No active tasks right now</h2>
          <p className="mt-1 text-sm text-muted">Browse nearby errands and send an offer to get your next job.</p>
          <Link href="/marketplace" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white">Find errands</Link>
        </section>
      ) : (
        <>
          {waiting.length ? (
            <section aria-labelledby="waiting-heading" className="grid gap-3">
              <h2 id="waiting-heading" className="text-sm font-extrabold text-ink">Waiting for your answer</h2>
              <ul className="grid gap-3">{waiting.map((item) => <TaskRow key={item.id} assignment={item} respond />)}</ul>
            </section>
          ) : null}
          {running.length ? (
            <section aria-labelledby="running-heading" className="grid gap-3">
              <h2 id="running-heading" className="text-sm font-extrabold text-ink">In progress</h2>
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
