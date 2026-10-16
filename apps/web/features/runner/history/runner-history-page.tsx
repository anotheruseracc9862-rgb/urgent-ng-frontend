'use client';

import { runnerQueries } from '@/features/runner/queries';
import { useSession } from '@/lib/auth/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';

type Assignment = components['schemas']['RunnerAssignmentSummaryDto'];
function money(minor: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
}

function titleCase(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(status: string) {
  if (status === 'COMPLETED') return 'bg-green-bg text-green-900';
  if (status === 'CANCELLED' || status === 'DECLINED' || status === 'TIMED_OUT') return 'bg-panel text-muted';
  return 'bg-amber-bg text-amber';
}

export function RunnerHistoryPage() {
  const { me } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => ({
    q: searchParams.get('q') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    status: searchParams.get('status') || undefined,
  }), [searchParams]);
  const list = useInfiniteQuery({
    queryKey: queryKeys.assignments.runnerHistory(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => offersApi.runnerAssignments({
      cursor: pageParam,
      limit: 20,
      ...filters,
    }),
    getNextPageParam: (page) => page.meta?.nextCursor ?? undefined,
    retry: false,
  });
  const summary = useQuery({
    queryKey: queryKeys.assignments.runnerHistorySummary(),
    queryFn: () => offersApi.runnerHistorySummary(6),
    retry: false,
  });
  const performance = useQuery(runnerQueries.performance(me.id));
  const assignments = list.data?.pages.flatMap((page) => page.data) ?? [];

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of ['q', 'from', 'to', 'status'] as const) {
      const value = String(form.get(key) ?? '').trim();
      if (value) next.set(key, value);
    }
    router.replace(`/runner/history${next.size ? `?${next}` : ''}`, { scroll: false });
  }

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) exportParams.set(key, value);
  const exportHref = `/api/v1/runner/assignments/export.csv${exportParams.size ? `?${exportParams}` : ''}`;

  return (
    <main className="mx-auto grid max-w-6xl gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--r-lg)] border border-line bg-tint p-4 shadow-[var(--shadow)] sm:p-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Runner workspace</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">Job history & performance</h1>
          <p className="mt-2 text-sm text-muted">Review your assignments and the figures used on your runner profile.</p>
        </div>
        <Button asChild variant="ghost"><a href={exportHref}>Export CSV</a></Button>
      </header>

      {performance.isPending ? <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-[var(--r-lg)]" />)}</div> : null}
      {performance.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load runner performance.</p>
          {isApiError(performance.error) && performance.error.requestId ? <p className="mt-1 text-xs">Request ID: {performance.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void performance.refetch()}>Try again</Button>
        </Alert>
      ) : null}
      {performance.data ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Runner performance figures">
          <Metric title="Completed errands" value={String(performance.data.completedErrands)} detail="All-time completed assignments" />
          <Metric
            title="Runner rating"
            value={performance.data.rating.average === null ? 'No sample' : `${performance.data.rating.average.toFixed(1)} / 5`}
            detail={performance.data.rating.average === null ? 'Not enough published ratings' : `${performance.data.rating.count} published ratings`}
          />
          <Metric
            title="Cancellation rate"
            value={performance.data.cancellation.sample === 0 || performance.data.cancellation.percent === null ? 'No sample' : `${performance.data.cancellation.percent}%`}
            detail={`Last ${performance.data.cancellation.windowSize} accepted errands · sample ${performance.data.cancellation.sample}`}
          />
          <Metric
            title="Response time"
            value={performance.data.response.sample === 0 || performance.data.response.medianMinutes === null ? 'No sample' : `${performance.data.response.medianMinutes} min`}
            detail={`Window ${performance.data.response.windowSize} · sample ${performance.data.response.sample}`}
          />
        </section>
      ) : null}
      {performance.data ? (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <div>
            <h2 className="font-extrabold text-ink">Runner badges</h2>
            <p className="mt-1 text-sm text-muted">Reliable service and completed errands help build your runner reputation.</p>
          </div>
          {performance.data.badges.length ? (
            <ul className="flex flex-wrap gap-2">
              {performance.data.badges.map((badge) => <li key={badge} className="rounded-full bg-green-bg px-3 py-2 text-xs font-bold text-green-900">{titleCase(badge)}</li>)}
            </ul>
          ) : <p className="text-sm text-muted">No badges earned yet. Keep completing errands and responding promptly to earn recognition.</p>}
        </section>
      ) : null}

      {summary.isPending ? <Skeleton className="h-56 rounded-[var(--r-lg)]" /> : null}
      {summary.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load your monthly history summary.</p>
          {isApiError(summary.error) && summary.error.requestId ? <p className="mt-1 text-xs">Request ID: {summary.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void summary.refetch()}>Try again</Button>
        </Alert>
      ) : null}
      {summary.data ? <HistorySummaryChart months={summary.data.months} completed={summary.data.completed} total={summary.data.total} /> : null}

      <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Assignments</h2>
          <p className="text-sm text-muted">Locations shown here are approximate until an assignment is accepted.</p>
        </div>
        <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="grid gap-1 text-xs font-bold text-muted">Search
            <input name="q" defaultValue={filters.q ?? ''} className="min-h-10 rounded-lg border border-line bg-panel px-3 text-sm text-ink" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-muted">From
            <input name="from" type="date" defaultValue={filters.from ?? ''} className="min-h-10 rounded-lg border border-line bg-panel px-3 text-sm text-ink" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-muted">To
            <input name="to" type="date" defaultValue={filters.to ?? ''} className="min-h-10 rounded-lg border border-line bg-panel px-3 text-sm text-ink" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-muted">Status
            <select name="status" defaultValue={filters.status ?? ''} className="min-h-10 rounded-lg border border-line bg-panel px-3 text-sm text-ink">
              <option value="">All statuses</option>
              {(['ACTIVE', 'PAST', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'DECLINED', 'TIMED_OUT', 'CANCELLED', 'COMPLETED'] as const).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
            </select>
          </label>
          <div className="flex items-end"><Button type="submit">Apply filters</Button></div>
        </form>
      </section>

      {list.isPending ? <div className="grid gap-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-[var(--r-lg)]" />)}</div> : null}
      {list.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load assignment history.</p>
          {isApiError(list.error) && list.error.requestId ? <p className="mt-1 text-xs">Request ID: {list.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void list.refetch()}>Try again</Button>
        </Alert>
      ) : null}
      {!list.isPending && !list.error && assignments.length === 0 ? (
        <section className="rounded-[var(--r-lg)] border border-dashed border-line bg-surface p-8 text-center">
          <h2 className="font-extrabold text-ink">No assignments found</h2>
          <p className="mt-2 text-sm text-muted">Try changing your filters, or browse open errands when you are ready for your next job.</p>
          <Button asChild className="mt-4"><Link href="/marketplace">Browse errands</Link></Button>
        </section>
      ) : null}
      <section className="grid gap-3">
        {assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}
      </section>
      {list.hasNextPage ? (
        <Button type="button" variant="ghost" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          {list.isFetchingNextPage ? 'Loading…' : 'Load more assignments'}
        </Button>
      ) : null}
    </main>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="grid content-between gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <h2 className="text-xs font-extrabold uppercase tracking-wide text-muted">{title}</h2>
      <p className="text-2xl font-extrabold text-ink">{value}</p>
      <p className="text-xs text-muted">{detail}</p>
    </article>
  );
}

function HistorySummaryChart({ months, completed, total }: {
  months: components['schemas']['HistoryMonthDto'][];
  completed: number;
  total: number;
}) {
  const max = Math.max(1, ...months.map((month) => month.completed + month.cancelled + month.notAccepted));
  return (
    <section className="grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <div>
        <h2 className="font-extrabold text-ink">Last six months</h2>
        <p className="mt-1 text-sm text-muted">{completed} completed from {total} selected assignments</p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {months.map((month) => {
          const height = ((month.completed + month.cancelled + month.notAccepted) / max) * 100;
          return (
            <div key={month.month} className="grid min-w-0 justify-items-center gap-2">
              <div className="flex h-28 w-full items-end rounded-lg bg-panel p-1" aria-label={`${month.month}: ${month.completed} completed, ${month.cancelled} cancelled, ${month.notAccepted} not accepted`}>
                <div className="w-full rounded-sm bg-green-700" style={{ height: `${Math.max(height, month.completed ? 8 : 0)}%` }} />
              </div>
              <span className="truncate text-[11px] font-bold text-muted">{month.month}</span>
              <span className="text-xs font-bold text-ink">{month.completed} done</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  return (
    <article className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle(assignment.status)}`}>{titleCase(assignment.status)}</span>
          <span className="text-xs text-muted">Selected {new Date(assignment.selectedAt).toLocaleDateString()}</span>
        </div>
        <h3 className="mt-2 break-words font-extrabold text-ink">{assignment.errandTitle}</h3>
        <p className="mt-1 text-sm text-muted">{assignment.pickupArea ?? 'Pickup area unavailable'}{assignment.destinationArea ? ` → ${assignment.destinationArea}` : ''}</p>
        <p className="mt-1 text-sm font-bold text-ink">{money(assignment.agreedAmountMinor)}</p>
      </div>
      <Button asChild variant="ghost"><Link href={`/assignments/${assignment.id}`}>View assignment</Link></Button>
    </article>
  );
}
