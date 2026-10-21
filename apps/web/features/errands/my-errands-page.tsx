'use client';

import { ProBadge } from '@/components/runner/pro-badge';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AlertCircle, Clock3, Info, Package, Plus, Search, Tag, Truck } from 'lucide-react';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatRelativeTime } from '@urgent/utils';
import { PageHead } from '@/components/shell/page-head';
import { Stat } from '@/components/shell/stat-card';
import { useSession } from '@/lib/auth/client';
import { isApiError } from '@/lib/api/client';
import { formatMinutes, minutesUntil } from '@/lib/time-left';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import { dashboardQueries } from '@/features/dashboard/queries';
import { useApiMutation } from '@/lib/query/mutations';
import { errandsApi, type ErrandSummary, type MyErrandFilters } from './api';
import { errandQueries } from './queries';
import { isService } from '@/features/reference/flow';

type Tab = NonNullable<MyErrandFilters['tab']>;
type Sort = NonNullable<MyErrandFilters['sort']>;
type Status = components['schemas']['ErrandStatus'];
type Counts = components['schemas']['MineCountsDto'];

/** The demo's tabs. "All" has no value: the API lists every errand when no tab is sent. */
const TABS: Array<{ value: Tab | 'ALL'; label: string; count: keyof Counts }> = [
  { value: 'ALL', label: 'All', count: 'all' },
  { value: 'ATTENTION', label: 'Needs attention', count: 'attention' },
  { value: 'OPEN', label: 'Open', count: 'open' },
  { value: 'ACTIVE', label: 'In progress', count: 'active' },
  { value: 'PAST', label: 'Past', count: 'past' },
  { value: 'DRAFT', label: 'Drafts', count: 'draft' },
];

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'RECENT', label: 'Recent activity' },
  { value: 'NEEDS_ATTENTION', label: 'Needs attention' },
  { value: 'HIGHEST_AMOUNT', label: 'Highest amount' },
];

const BADGE_TONE = {
  amber: 'bg-amber-bg text-amber',
  blue: 'bg-blue-bg text-blue',
  green: 'bg-ok-bg text-ok',
  red: 'bg-red-bg text-red',
  plain: 'bg-panel text-ink-2',
} as const;

const STATUS: Record<Status, { label: string; tone: keyof typeof BADGE_TONE; stage: number | null }> = {
  DRAFT: { label: 'Draft', tone: 'plain', stage: null },
  OPEN: { label: 'Open', tone: 'amber', stage: null },
  RUNNER_SELECTED: { label: 'Runner selected', tone: 'blue', stage: 0 },
  ACCEPTED: { label: 'Accepted', tone: 'blue', stage: 1 },
  IN_PROGRESS: { label: 'In progress', tone: 'blue', stage: 2 },
  PICKED_UP: { label: 'Picked up', tone: 'blue', stage: 3 },
  DELIVERED: { label: 'Delivered', tone: 'green', stage: 4 },
  COMPLETED: { label: 'Completed', tone: 'plain', stage: 5 },
  CANCELLED: { label: 'Cancelled', tone: 'red', stage: null },
  EXPIRED: { label: 'Expired', tone: 'red', stage: null },
  DISPUTED: { label: 'Disputed', tone: 'red', stage: null },
};

const STAGES = ['Selected', 'Accepted', 'Started', 'Picked up', 'Delivered', 'Done'];
const AVATAR_TONE = ['bg-tint-2 text-green-900', 'bg-violet-bg text-violet', 'bg-amber-bg text-amber', 'bg-blue-bg text-blue'];

function parseTab(value: string | null): Tab | undefined {
  return TABS.find((tab) => tab.value === value && tab.value !== 'ALL')?.value as Tab | undefined;
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

function initials(first: string, last?: string | null) {
  return `${first[0] ?? ''}${last?.[0] ?? first[1] ?? ''}`.toUpperCase();
}

function Badge({ tone, children }: { tone: keyof typeof BADGE_TONE; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold ${BADGE_TONE[tone]}`}>{children}</span>;
}

function Avatar({ name, last, index = 0, className = '' }: { name: string; last?: string | null; index?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full border-2 border-surface text-[11px] font-extrabold ${AVATAR_TONE[index % AVATAR_TONE.length]} ${className}`}>
      {initials(name, last)}
    </span>
  );
}

/** What the card tells the requester to do next, as the demo's coloured note row. */
function attentionNote(errand: ErrandSummary): { tone: 'warn' | 'danger' | 'info' | 'ok'; text: string } | null {
  const left = minutesUntil(errand.attentionExpiresAt);
  switch (errand.attention) {
    case 'EXPIRING':
      return { tone: 'danger', text: `Closes in ${left === null ? 'a few minutes' : formatMinutes(left)} · extend it once, or boost it.` };
    case 'CHANGE_REQUEST':
      return { tone: 'info', text: `${errand.runner?.firstName ?? 'The runner'} asked to change this errand${left === null ? '' : ` · answer within ${formatMinutes(left)}`}.` };
    case 'DELIVERY':
      return { tone: 'ok', text: `${errand.runner?.firstName ?? 'The runner'} ${isService(errand.category) ? 'finished the work' : 'delivered it'} · confirm, or it completes automatically.` };
    case 'RUNNER_TO_CONFIRM':
      return { tone: 'warn', text: `Waiting for ${errand.runner?.firstName ?? 'the runner'} to accept.` };
    default:
      return null;
  }
}

const NOTE_TONE = {
  warn: 'bg-amber-bg text-[#7a4800]',
  danger: 'bg-red-bg text-[#8f2a22]',
  info: 'bg-blue-bg text-[#1b3f8f]',
  ok: 'bg-ok-bg text-[#145c30]',
} as const;

function primaryAction(errand: ErrandSummary): { label: string; emphasised: boolean } {
  switch (errand.attention) {
    case 'OFFERS': return { label: `Review ${errand.offerCount} offer${errand.offerCount === 1 ? '' : 's'}`, emphasised: true };
    case 'EXPIRING': return { label: errand.offerCount ? 'Review offers' : 'Extend', emphasised: true };
    case 'DELIVERY': return { label: isService(errand.category) ? 'Confirm work done' : 'Confirm delivery', emphasised: true };
    case 'CHANGE_REQUEST': return { label: 'Answer request', emphasised: true };
    case 'RUNNER_TO_CONFIRM': return { label: 'View', emphasised: true };
    default: break;
  }
  switch (errand.status) {
    case 'DRAFT': return { label: 'Continue editing', emphasised: false };
    case 'OPEN': return { label: errand.offerCount ? `Review ${errand.offerCount} offer${errand.offerCount === 1 ? '' : 's'}` : 'View errand', emphasised: false };
    case 'COMPLETED': return { label: 'View errand', emphasised: false };
    case 'CANCELLED':
    case 'EXPIRED': return { label: 'Repost', emphasised: false };
    default: return { label: 'Track errand', emphasised: false };
  }
}

function ErrandCard({ errand }: { errand: ErrandSummary }) {
  const router = useRouter();
  const status = STATUS[errand.status];
  const href = errand.status === 'DRAFT' ? `/errands/${errand.id}/edit` : `/errands/${errand.id}`;
  // With a runner on the job, progress, delivery and change requests live on the assignment page.
  const onAssignment = Boolean(errand.assignmentId) && ['RUNNER_SELECTED', 'ACCEPTED', 'IN_PROGRESS', 'PICKED_UP', 'DELIVERED', 'DISPUTED'].includes(errand.status);
  const primaryHref = onAssignment ? `/assignments/${errand.assignmentId}` : href;
  const note = attentionNote(errand);
  const action = primaryAction(errand);
  const closesIn = errand.status === 'OPEN' ? minutesUntil(errand.expiresAt) : null;
  const repost = errand.status === 'CANCELLED' || errand.status === 'EXPIRED';
  const duplicate = useApiMutation({
    mutationFn: () => errandsApi.duplicate(errand.id),
    // A new draft appears in the list and in the counts.
    affects: ['errands'],
    onSuccess: (draft) => router.push(`/errands/${draft.id}/edit`),
  });
  const when = errand.status === 'COMPLETED' ? 'Completed'
    : errand.status === 'DRAFT' ? 'Not posted'
      : errand.timeMode === 'SCHEDULED' && errand.scheduledAt ? `Scheduled ${dateLabel(errand.scheduledAt)}`
        : errand.timeMode === 'ASAP' ? 'As soon as possible' : null;
  const posted = errand.publishedAt ?? errand.createdAt;

  return (
    <article className="grid content-start gap-4 rounded-[var(--r-lg)] bg-surface p-5 shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(23,33,46,.04),0_22px_44px_-18px_rgba(23,33,46,.28)] max-lg:min-w-0 max-lg:grid-cols-[minmax(0,1fr)] max-lg:break-words max-sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="inline-flex rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold text-green-900">{errand.category.name}</span>
        </div>
        <span className="text-[11px] text-muted">{errand.status === 'DRAFT' ? 'Saved' : 'Posted'} {formatRelativeTime(posted)}</span>
      </div>

      <h2 className="text-base font-extrabold leading-snug tracking-[-0.01em] text-ink">
        <Link href={href} className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600">{errand.title}</Link>
      </h2>

      <div className="grid gap-2 rounded-[var(--r-sm)] bg-panel px-3.5 py-3 text-[12.5px]">
        <div className="flex items-start gap-2.5"><i aria-hidden="true" className="mt-[5px] size-2.5 shrink-0 rounded-full bg-lime-600" /><span>{isService(errand.category) ? (errand.destinationArea ?? 'Service address to be added') : (errand.pickupArea ?? 'Pickup to be added')}</span></div>
        {errand.destinationArea && !isService(errand.category) ? <div className="flex items-start gap-2.5"><i aria-hidden="true" className="mt-[5px] size-2.5 shrink-0 rounded-full bg-ink" /><span>{errand.destinationArea}</span></div> : null}
      </div>

      {note ? (
        <div role="status" className={`flex items-start gap-2.5 rounded-[var(--r)] px-3.5 py-2.5 text-[12.5px] leading-snug ${NOTE_TONE[note.tone]}`}>
          {note.tone === 'danger' ? <Clock3 aria-hidden="true" className="mt-px size-4 shrink-0" /> : <Info aria-hidden="true" className="mt-px size-4 shrink-0" />}
          <span>{note.text}</span>
        </div>
      ) : null}

      {errand.status === 'OPEN' && errand.offerCount > 0 ? (
        <div className="flex items-center gap-3 rounded-[var(--r)] border border-line p-3 max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex shrink-0">
            {errand.offerPreview.map((offer, index) => (
              <Avatar key={`${offer.firstName}-${index}`} name={offer.firstName} last={offer.lastName} index={index} className={index ? '-ml-2' : ''} />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <b className="text-sm text-ink">{errand.offerCount} offer{errand.offerCount === 1 ? '' : 's'}</b>
            <div className="text-xs text-muted">
              {errand.lowestOfferMinor !== null ? `Lowest ${money(errand.lowestOfferMinor)}` : 'Offers received'}
              {errand.suggestedBudgetMinor !== null ? ` · your budget ${money(errand.suggestedBudgetMinor)}` : ''}
            </div>
          </div>
          {closesIn !== null ? (
            <div className="shrink-0 text-right text-xs text-muted max-sm:col-span-2 max-sm:text-left">Closes in<br className="max-sm:hidden" /> <b className="text-ink">{formatMinutes(closesIn)}</b></div>
          ) : null}
        </div>
      ) : null}

      {errand.runner ? (
        <div className="grid gap-3 rounded-[var(--r)] border border-line p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={errand.runner.firstName} last={errand.runner.lastName} className="!size-10" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm text-ink">{errand.runner.firstName}{errand.runner.lastName ? ` ${errand.runner.lastName[0]}.` : ''}</b>
                <Badge tone="green">✓ Verified</Badge>
                {errand.runner.isPro ? <ProBadge /> : null}
              </div>
              <div className="text-xs text-muted">
                {errand.runner.rating !== null ? `★ ${errand.runner.rating.toFixed(1)} · ` : ''}{errand.runner.completedErrands} errand{errand.runner.completedErrands === 1 ? '' : 's'}
              </div>
            </div>
            {errand.agreedAmountMinor !== null ? (
              <div className="text-right text-xl font-extrabold tracking-[-0.03em] tabular-nums text-ink max-sm:w-full max-sm:border-t max-sm:border-line max-sm:pt-2 max-sm:text-left">
                {money(errand.agreedAmountMinor)}
                <small className="block text-[11px] font-semibold tracking-normal text-muted">agreed · paid directly</small>
              </div>
            ) : null}
          </div>
          {status.stage !== null ? (
            <ol aria-label={`Progress: ${STAGES[Math.min(status.stage, STAGES.length - 1)]}`} className="grid grid-flow-col auto-cols-fr gap-1.5">
              {STAGES.map((stage, index) => (
                <li key={stage} className="grid">
                  <span className={`h-1.5 rounded-full ${index < status.stage! ? 'bg-lime-600' : index === status.stage ? 'bg-ink' : 'bg-line'}`} />
                  <span className="sr-only">{stage}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      {errand.status === 'EXPIRED' ? <p className="text-xs text-muted">Expired with {errand.offerCount} offer{errand.offerCount === 1 ? '' : 's'} and none selected.</p> : null}
      {errand.status === 'CANCELLED' ? <p className="text-xs text-muted">This errand was cancelled. You can repost it as a new draft.</p> : null}

      {duplicate.error ? <p role="alert" className="text-xs font-bold text-red">We could not repost this errand. Please try again.</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted">
          Budget <b className="text-ink">{money(errand.suggestedBudgetMinor)}</b>{when ? <> · {when}</> : null}
        </div>
        <div className="flex gap-2 max-sm:w-full max-sm:[&>*]:min-h-11 max-sm:[&>*]:flex-1 max-sm:[&>*]:justify-center">
          {/* Shown only when it goes somewhere the main button does not (the errand, beside Repost or the assignment). */}
          {repost || primaryHref !== href ? <Link href={href} className="inline-flex min-h-9 items-center rounded-full bg-surface px-3.5 text-[12.5px] font-bold text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel">Details</Link> : null}
          {repost ? (
            <button
              type="button"
              disabled={duplicate.isPending}
              onClick={() => duplicate.mutate()}
              className="inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-[12.5px] font-bold text-white hover:bg-[#0f1822] disabled:opacity-60"
            >
              {duplicate.isPending ? 'Reposting…' : 'Repost'}
            </button>
          ) : (
            <Link
              href={primaryHref}
              className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[12.5px] font-bold ${action.emphasised ? 'bg-lime text-ink hover:bg-lime-600' : 'bg-ink text-white hover:bg-[#0f1822]'}`}
            >
              {action.label}
            </Link>
          )}
        </div>
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
    <label className="relative block min-w-0 max-sm:w-full sm:w-[260px]">
      <span className="sr-only">Search errands</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        aria-label="Search errands"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search errands or runners"
        className="h-[42px] w-full rounded-full border-0 bg-panel pl-10 pr-4 text-[13px] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-lime-600"
      />
    </label>
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
  const selectTab = (value: Tab | 'ALL') => updateUrl('tab', value === 'ALL' ? '' : value);

  // With the live stream up, realtime events refresh these. Poll only while it is not delivering.
  const polling = useLivePolling(30_000);
  const summary = useQuery(dashboardQueries.summary(me.id));
  const counts = useQuery({ ...errandQueries.counts(me.id), refetchInterval: polling });
  const errands = useInfiniteQuery({
    ...errandQueries.mine(me.id, { tab, sort, q }),
    refetchInterval: polling,
  });
  const items = useMemo(() => errands.data?.pages.flatMap((page) => page.data) ?? [], [errands.data]);
  const requester = summary.data?.asRequester;
  const total = counts.data;

  if (errands.error && items.length === 0) {
    return (
      <Alert variant="danger" role="alert">
        <div className="grid gap-2">
          <p>{isApiError(errands.error) && errands.error.status === 403 ? 'Your account cannot access these errands right now.' : 'We could not load your errands.'}</p>
          <Button type="button" variant="ghost" onClick={() => void errands.refetch()}>Try again</Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="grid content-start gap-4 pb-10 max-lg:grid-cols-[minmax(0,1fr)]">
      <PageHead
        eyebrow="Requester"
        title="My errands"
        description="Everything you posted, with offers, runners and what to do next."
        actions={(
          <>
            <Button variant="ghost" className="max-sm:px-3" asChild><Link href="/boosts">Boost an errand</Link></Button>
            <Button className="max-sm:px-3" asChild><Link href="/errands/new"><Plus aria-hidden="true" className="size-4" />Post an errand</Link></Button>
          </>
        )}
      />

      {summary.error ? (
        <Alert variant="danger" role="alert">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>We could not load the errand overview; your list is still available.</span>
            <Button type="button" variant="ghost" onClick={() => void summary.refetch()}>Retry summary</Button>
          </div>
        </Alert>
      ) : null}

      <section aria-label="Errand overview" className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Package} value={total?.open ?? requester?.openErrands ?? '—'} label="Open for offers" onClick={() => selectTab('OPEN')} />
        <Stat icon={Tag} value={requester?.offersToReview ?? '—'} label="Offers to review" tone="amber" onClick={() => updateFilters({ tab: 'OPEN', sort: 'NEEDS_ATTENTION' })} />
        <Stat icon={Truck} value={total?.active ?? requester?.activeErrands ?? '—'} label="With a runner" tone="blue" onClick={() => selectTab('ACTIVE')} />
        <Stat icon={AlertCircle} value={total?.attention ?? '—'} label="Need your attention" tone="red" onClick={() => selectTab('ATTENTION')} />
      </section>

      <section className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Errand status filter" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-panel p-1 [scrollbar-width:none]">
            {TABS.map((item) => {
              const selected = (tab ?? 'ALL') === item.value;
              const count = total?.[item.count];
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectTab(item.value)}
                  className={`inline-flex items-center gap-[7px] whitespace-nowrap rounded-full px-4 py-[9px] text-[13px] font-bold transition-colors ${selected ? 'bg-surface text-ink shadow-[0_1px_4px_rgba(23,33,46,.12)]' : 'text-muted hover:text-ink'}`}
                >
                  {item.label}
                  {count !== undefined ? <span className={`rounded-full px-[7px] py-px text-[11px] ${selected ? 'bg-lime text-ink' : 'bg-line text-ink-2'}`}>{count}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2.5 max-sm:w-full">
            <SearchFilter key={q} initialValue={q} onSearch={(value) => updateUrl('q', value, true)} />
            <select
              aria-label="Sort"
              value={sort}
              onChange={(event) => updateUrl('sort', event.target.value)}
              className="min-h-[42px] rounded-full border border-line bg-surface px-4 text-[13px] font-semibold text-ink max-sm:w-full max-sm:min-w-0"
            >
              {SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      {errands.error && items.length ? (
        <Alert variant="danger" role="alert">
          Some errands could not be refreshed. 
          <Button type="button" variant="ghost" size="sm" onClick={() => void errands.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      {errands.isPending ? (
        <section aria-label="Loading errands" aria-busy="true" className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((value) => <Skeleton key={value} className="h-72 rounded-[var(--r-lg)]" />)}
        </section>
      ) : items.length ? (
        <section aria-label="Errand results" className="grid gap-4 md:grid-cols-2">
          {items.map((errand) => <ErrandCard key={errand.id} errand={errand} />)}
        </section>
      ) : (
        <div className="grid justify-items-center gap-2.5 rounded-[var(--r-lg)] bg-surface px-5 py-10 text-center shadow-[var(--shadow)]">
          <span className="grid size-14 place-items-center rounded-[18px] bg-panel text-ink-2"><Package aria-hidden="true" className="size-6" /></span>
          <h2 className="text-[15px] font-extrabold text-ink">No errands here</h2>
          <p className="max-w-md text-sm text-muted">{q ? 'Try a different search, or clear the search field.' : 'Try another tab, or post a new errand.'}</p>
          {q ? (
            <Button type="button" variant="soft" onClick={() => updateUrl('q', '', true)}>Clear search</Button>
          ) : (
            <Button asChild className="mt-1"><Link href="/errands/new">Post an errand</Link></Button>
          )}
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
