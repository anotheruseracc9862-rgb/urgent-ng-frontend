'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, ChevronRight, Clock3, MapPin } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatMoney } from '@urgent/utils';
import { PageHead } from '@/components/shell/page-head';
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
        className="group block rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] transition-colors hover:bg-tint motion-reduce:transition-none sm:p-[22px]"
      >
        <span className="flex flex-wrap items-start justify-between gap-3">
          <span className="flex min-w-0 items-start gap-3">
            <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-[13px] ${respond ? 'bg-blue-bg text-blue' : 'bg-tint-2 text-green-900'}`}>
              {respond ? <Clock3 className="size-[18px]" /> : <BriefcaseBusiness className="size-[18px]" />}
            </span>
            <span className="min-w-0">
              <strong className="block break-words text-sm font-extrabold leading-snug text-ink">{assignment.errandTitle}</strong>
              <span className="mt-1 block text-[11px] font-extrabold uppercase tracking-wide text-muted">
                {respond ? 'Waiting for your answer' : assignment.errandStatus.replaceAll('_', ' ')}
              </span>
            </span>
          </span>
          <span className="rounded-full bg-panel px-3 py-1.5 text-xs font-extrabold text-ink">{formatMoney(assignment.agreedAmountMinor)}</span>
        </span>
        <span className="mt-4 flex items-center gap-2 border-t border-line-2 pt-3 text-xs text-muted">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {assignment.pickupArea ?? 'Pickup area not shared'}{assignment.destinationArea ? ` → ${assignment.destinationArea}` : ''}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-bold text-green-800 group-hover:underline">
            {respond ? 'Respond' : 'Open task'} <ChevronRight aria-hidden="true" className="size-3.5" />
          </span>
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
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Runner"
        title="Active task"
        description="Keep the requester updated as each task moves along."
      />

      {error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load your tasks.</p>
          {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
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
