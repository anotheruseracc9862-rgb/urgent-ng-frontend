'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Package,
  Truck,
  XCircle,
} from 'lucide-react';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { useSession } from '@/lib/auth/client';
import { api, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { errandsApi, type ErrandSummary, type MyErrandFilters } from './api';

type Tab = NonNullable<MyErrandFilters['tab']>;
type Sort = NonNullable<MyErrandFilters['sort']>;
type Status = components['schemas']['ErrandStatus'];
type Summary = components['schemas']['MeSummaryDto'];

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACTIVE', label: 'With a runner' },
  { value: 'PAST', label: 'Past' },
];

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'RECENT', label: 'Most recent' },
  { value: 'NEEDS_ATTENTION', label: 'Needs attention' },
  { value: 'HIGHEST_AMOUNT', label: 'Highest amount' },
];

const STATUS_PRESENTATION: Record<Status, { label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; tone: string }> = {
  DRAFT: { label: 'Draft', icon: Package, tone: 'bg-panel text-ink-2' },
  OPEN: { label: 'Open', icon: Clock3, tone: 'bg-amber-bg text-amber' },
  RUNNER_SELECTED: { label: 'Runner selected', icon: Truck, tone: 'bg-blue-bg text-blue' },
  ACCEPTED: { label: 'Accepted', icon: Truck, tone: 'bg-blue-bg text-blue' },
  IN_PROGRESS: { label: 'In progress', icon: Truck, tone: 'bg-blue-bg text-blue' },
  PICKED_UP: { label: 'Picked up', icon: Package, tone: 'bg-blue-bg text-blue' },
  DELIVERED: { label: 'Delivered', icon: CheckCircle2, tone: 'bg-green-bg text-green-800' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, tone: 'bg-green-bg text-green-800' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, tone: 'bg-red-bg text-red' },
  EXPIRED: { label: 'Expired', icon: AlertCircle, tone: 'bg-red-bg text-red' },
  DISPUTED: { label: 'Disputed', icon: AlertCircle, tone: 'bg-amber-bg text-amber' },
};

function parseTab(value: string | null): Tab {
  return TABS.find((tab) => tab.value === value)?.value ?? 'OPEN';
}

function parseSort(value: string | null): Sort {
  return SORTS.find((sort) => sort.value === value)?.value ?? 'RECENT';
}

function money(minor: number | null) {
  return minor === null
    ? 'No budget'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(value));
}

function statusLabel(status: Status): string {
  return STATUS_PRESENTATION[status].label;
}

function ErrandCard({ errand }: { errand: ErrandSummary }) {
  const presentation = STATUS_PRESENTATION[errand.status];
  const Icon = presentation.icon;
  const href = errand.status === 'DRAFT' ? `/errands/${errand.id}/edit` : `/errands/${errand.id}`;
  const places = [errand.pickupArea, errand.destinationArea].filter(Boolean);
  const when = errand.timeMode === 'SCHEDULED' && errand.scheduledAt
    ? `Scheduled ${dateLabel(errand.scheduledAt)}`
    : errand.timeMode === 'ASAP'
      ? 'As soon as possible'
      : null;

  return (
    <article className="grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${presentation.tone}`}>
            <Icon aria-hidden={true} className="size-3.5" />
            {statusLabel(errand.status)}
          </span>
          <span className="inline-flex rounded-full bg-lime/30 px-2.5 py-1 text-xs font-bold text-ink">{errand.category.name}</span>
        </div>
        <span className="text-xs text-muted">{errand.id} · Updated {dateLabel(errand.updatedAt)}</span>
      </div>
      <div>
        <h2 className="text-base font-extrabold text-ink"><Link href={href} className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700">{errand.title}</Link></h2>
        <p className="mt-1 text-sm text-muted">{places.length ? places.join(' → ') : 'Location details to be added'}</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
        <p className="text-sm text-muted">
          Budget <strong className="text-ink">{money(errand.suggestedBudgetMinor)}</strong>
          {when ? <> · {when}</> : null}
          {errand.status === 'OPEN' ? <> · {errand.offerCount} {errand.offerCount === 1 ? 'offer' : 'offers'}</> : null}
        </p>
        <Link href={href} className="inline-flex min-h-10 items-center justify-center rounded-full bg-green-800 px-4 text-sm font-bold text-white hover:bg-green-900">
          {errand.status === 'DRAFT' ? 'Continue editing' : errand.status === 'OPEN' ? `Review ${errand.offerCount ? `${errand.offerCount} ` : ''}offers` : errand.status === 'COMPLETED' ? 'View completed errand' : 'View details'}
        </Link>
      </div>
    </article>
  );
}

function SearchFilter({ initialValue, onSearch }: { initialValue: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const next = value.trim();
    if (next === initialValue) return;
    const timer = window.setTimeout(() => onSearch(next), 350);
    return () => window.clearTimeout(timer);
  }, [initialValue, onSearch, value]);

  return (
    <label className="grid gap-1 text-xs font-bold text-muted">
      Search errands or runners
      <input
        type="search"
        aria-label="Search errands"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Title, area, runner…"
        className="min-h-11 w-full rounded-full border border-line bg-surface px-4 text-sm font-normal text-ink"
      />
    </label>
  );
}

function SummaryCard({ label, value, icon: Icon, tone, onClick }: {
  label: string;
  value: number;
  icon: typeof Package;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 text-left shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
      <span className={`grid size-10 place-items-center rounded-full ${tone}`}><Icon aria-hidden="true" className="size-5" /></span>
      <span className="text-2xl font-extrabold leading-none text-ink">{value}</span>
      <span className="text-xs font-bold text-muted">{label}</span>
    </button>
  );
}

export function MyErrandsPage() {
  const { me } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const tab = parseTab(searchParams.get('tab'));
  const sort = parseSort(searchParams.get('sort'));
  const q = (searchParams.get('q') ?? '').trim();

  const updateFilters = useCallback((filters: Record<string, string>, replace = false) => {
    const params = new URLSearchParams(searchString);
    for (const [name, value] of Object.entries(filters)) {
      if (value) params.set(name, value);
      else params.delete(name);
    }
    params.delete('cursor');
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [pathname, router, searchString]);
  const updateUrl = useCallback((name: string, value: string, replace = false) => {
    updateFilters({ [name]: value }, replace);
  }, [updateFilters]);

  const summary = useQuery({
    queryKey: queryKeys.dashboard.summary(me.id),
    queryFn: () => api<Summary>('/me/summary'),
    staleTime: 30_000,
  });
  const errands = useInfiniteQuery({
    queryKey: [...queryKeys.errands.list({ tab, sort, q }), me.id],
    queryFn: ({ pageParam }) => errandsApi.mine({ tab, sort, q: q || undefined, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta?.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const items = useMemo(() => errands.data?.pages.flatMap((page) => page.data) ?? [], [errands.data]);
  const requester = summary.data?.asRequester;

  if (errands.isLoading) {
    return <div className="mx-auto grid max-w-6xl gap-4"><Skeleton className="h-14" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[1, 2, 3, 4].map((value) => <Skeleton key={value} className="h-32 rounded-[var(--r-lg)]" />)}</div><div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map((value) => <Skeleton key={value} className="h-48 rounded-[var(--r-lg)]" />)}</div></div>;
  }

  if (errands.error && items.length === 0) {
    return (
      <Alert variant="danger" role="alert">
        <div className="grid gap-2">
          <p>{isApiError(errands.error) && errands.error.status === 403 ? 'Your account cannot access these errands right now.' : 'We could not load your errands.'}</p>
          {isApiError(errands.error) && errands.error.requestId ? <p className="text-xs">Request ID: {errands.error.requestId}</p> : null}
          <Button type="button" variant="ghost" onClick={() => void errands.refetch()}>Try again</Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Requester</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">My errands</h1>
          <p className="mt-1 text-sm text-muted">Everything you posted, with offers, runners and what to do next.</p>
        </div>
        <Link href="/errands/new" className="inline-flex min-h-11 items-center justify-center rounded-full bg-lime px-5 text-sm font-bold text-ink hover:bg-lime-600">Post an errand</Link>
      </header>

      {summary.error ? (
        <Alert variant="danger" role="alert">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>We could not load the errand overview; your list is still available.</span>
            <Button type="button" variant="ghost" onClick={() => void summary.refetch()}>Retry summary</Button>
          </div>
          {isApiError(summary.error) && summary.error.requestId ? <p className="mt-1 text-xs">Request ID: {summary.error.requestId}</p> : null}
        </Alert>
      ) : null}
      {requester ? (
        <section aria-label="Errand overview" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <SummaryCard label="Active errands" value={requester.openErrands + requester.activeErrands} icon={Package} tone="bg-green-bg text-green-800" onClick={() => updateUrl('tab', 'OPEN')} />
          <SummaryCard label="Offers waiting for you" value={requester.offersToReview} icon={AlertCircle} tone="bg-amber-bg text-amber" onClick={() => updateFilters({ tab: 'OPEN', sort: 'NEEDS_ATTENTION' })} />
          <SummaryCard label="Runners / deliveries needing action" value={requester.awaitingRunnerAcceptance + requester.deliveriesToConfirm} icon={Truck} tone="bg-blue-bg text-blue" onClick={() => updateUrl('tab', 'ACTIVE')} />
          <SummaryCard label="Completed this month" value={requester.completedThisMonth} icon={CheckCircle2} tone="bg-violet-bg text-violet" onClick={() => updateUrl('tab', 'PAST')} />
        </section>
      ) : summary.isLoading ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[1, 2, 3, 4].map((value) => <Skeleton key={value} className="h-32 rounded-[var(--r-lg)]" />)}</div>
      ) : null}

      <section className="grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Errand status filter">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={tab === item.value}
                onClick={() => updateUrl('tab', item.value)}
                className={`min-h-10 rounded-full px-4 text-sm font-bold ${tab === item.value ? 'bg-ink text-white' : 'bg-panel text-ink-2 hover:bg-tint'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <SearchFilter key={q} initialValue={q} onSearch={(value) => updateUrl('q', value, true)} />
            <label className="grid gap-1 text-xs font-bold text-muted" htmlFor="errands-sort">
              Sort
              <select id="errands-sort" value={sort} onChange={(event) => updateUrl('sort', event.target.value)} className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink">
                {SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      </section>

      {errands.error && items.length ? <Alert variant="danger" role="alert">Some errands could not be refreshed. {isApiError(errands.error) && errands.error.requestId ? `Request ID: ${errands.error.requestId}` : ''}<Button type="button" variant="ghost" onClick={() => void errands.refetch()}>Retry</Button></Alert> : null}
      {items.length ? (
        <section aria-label="Errand results" className="grid gap-3 md:grid-cols-2">
          {items.map((errand) => <ErrandCard key={errand.id} errand={errand} />)}
        </section>
      ) : (
        <div className="grid justify-items-center gap-3 rounded-[var(--r-lg)] border border-line bg-surface px-5 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-green-bg text-green-800"><Package aria-hidden="true" className="size-6" /></span>
          <h2 className="text-lg font-extrabold text-ink">No errands here</h2>
          <p className="max-w-md text-sm text-muted">{q ? 'Try a different search, or clear the search field.' : 'Try another status tab, or post a new errand.'}</p>
          {q ? <Button type="button" variant="soft" onClick={() => updateUrl('q', '', true)}>Clear search</Button> : <Link href="/errands/new" className="inline-flex min-h-11 items-center justify-center rounded-full bg-lime px-5 text-sm font-bold text-ink hover:bg-lime-600">Post an errand</Link>}
        </div>
      )}
      {errands.hasNextPage ? (
        <div className="flex justify-center">
          <Button type="button" variant="soft" onClick={() => void errands.fetchNextPage()} disabled={errands.isFetchingNextPage}>
            {errands.isFetchingNextPage ? 'Loading…' : 'Load more errands'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
