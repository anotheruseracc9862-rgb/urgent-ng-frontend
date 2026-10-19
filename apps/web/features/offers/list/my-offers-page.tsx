'use client';

import { persistedQuery } from '@/lib/query/persisted-query';
import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowRight, Clock3, Compass, Info, RefreshCw, Tag } from 'lucide-react';
import { Alert, Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { dashboardQueries } from '@/features/dashboard/queries';
import { runnerQueries } from '@/features/runner/queries';
import { offersApi, type RunnerOffer } from '../api';
import { PageHead } from '@/components/shell/page-head';

type StatusFilter = RunnerOffer['status'] | 'ALL';
const statuses: StatusFilter[] = ['ALL', 'ACTIVE', 'SELECTED', 'WITHDRAWN', 'REJECTED', 'EXPIRED', 'CLOSED'];

const money = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

const sentLabel = (date: string) => new Date(date).toLocaleString('en-NG', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

function labelFor(offer: RunnerOffer) {
  if (offer.status === 'ACTIVE' && offer.awaitingParty === 'RUNNER') return 'Counter received · Your turn';
  if (offer.status === 'ACTIVE' && offer.awaitingParty === 'REQUESTER') return 'Waiting for requester';
  if (offer.status === 'ACTIVE' && offer.awaitingParty === 'NONE') return 'Agreed · Waiting for selection';
  if (offer.status === 'SELECTED') return 'Selected';
  return offer.status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reasonLabel(reason: string | null) {
  return reason ? reason.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : null;
}

function groupTitle(offer: RunnerOffer) {
  if (offer.status === 'ACTIVE' && offer.awaitingParty === 'RUNNER') return 'Your turn';
  if (offer.status === 'ACTIVE' && offer.awaitingParty === 'REQUESTER') return 'Waiting for reply';
  if (offer.status === 'ACTIVE') return 'Agreed';
  if (offer.status === 'SELECTED') return 'Selected';
  return 'Closed';
}

export function MyOffersPage() {
  const { me } = useSession();
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const summary = useQuery(dashboardQueries.summary(me.id));
  const limit = useQuery(runnerQueries.offerLimit(me.id));
  const list = useInfiniteQuery({
    queryKey: queryKeys.runner.offers({ status }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => offersApi.runnerOffers({
      ...(status === 'ALL' ? {} : { status }),
      cursor: pageParam,
      limit: 20,
    }),
    getNextPageParam: (page) => page.meta?.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    ...persistedQuery('standard'),
  });

  const offers = list.data?.pages.flatMap((page) => page.data) ?? [];
  const groups = [
    { title: 'Your turn', rows: offers.filter((offer) => groupTitle(offer) === 'Your turn') },
    { title: 'Waiting for reply', rows: offers.filter((offer) => groupTitle(offer) === 'Waiting for reply') },
    { title: 'Agreed', rows: offers.filter((offer) => groupTitle(offer) === 'Agreed') },
    { title: 'Selected', rows: offers.filter((offer) => groupTitle(offer) === 'Selected') },
    { title: 'Closed', rows: offers.filter((offer) => groupTitle(offer) === 'Closed') },
  ];

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Runner"
        title="My offers"
        description="Track replies, respond to counters and review closed offers."
        actions={<Button asChild><Link href="/marketplace"><Compass aria-hidden="true" />Find errands</Link></Button>}
      />
      <dl aria-label="Offer overview" className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="min-w-0 rounded-[var(--r-lg)] bg-surface p-3.5 shadow-[var(--shadow)] sm:p-[22px]">
          <dt className="min-h-10 text-xs font-semibold text-muted sm:min-h-0">Open offers</dt>
          <dd className="mt-3 text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-ink sm:text-[32px]">{summary.isPending ? <Skeleton className="h-8 w-12" aria-label="Loading open offers" /> : summary.data?.asRunner.activeOffers ?? <span aria-label="Open offer count unavailable">–</span>}</dd>
        </div>
        <div className="min-w-0 rounded-[var(--r-lg)] bg-surface p-3.5 shadow-[var(--shadow)] sm:p-[22px]">
          <dt className="min-h-10 text-xs font-semibold text-muted sm:min-h-0">Awaiting your reply</dt>
          <dd className="mt-3 text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-ink sm:text-[32px]">{summary.isPending ? <Skeleton className="h-8 w-12" aria-label="Loading replies needed" /> : summary.data?.asRunner.offersAwaitingYou ?? <span aria-label="Reply count unavailable">–</span>}</dd>
        </div>
        <div className="min-w-0 rounded-[var(--r-lg)] bg-surface p-3.5 shadow-[var(--shadow)] sm:p-[22px]">
          <dt className="min-h-10 text-xs font-semibold text-muted sm:min-h-0">{limit.data && !limit.data.isPro ? 'Free offers left today' : 'Offers left today'}</dt>
          <dd className="mt-3 text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-ink sm:text-[32px]">{limit.isPending ? <Skeleton className="h-8 w-12" aria-label="Loading offer allowance" /> : limit.data?.remaining ?? <span aria-label="Offer allowance unavailable">–</span>}</dd>
        </div>
      </dl>
      {summary.error || limit.error ? <Alert variant="warn" role="status"><p>Some overview figures could not be updated. Your offers are still available below.</p><Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => { void summary.refetch(); void limit.refetch(); }}>Retry overview</Button></Alert> : null}

      <section aria-label="Offer activity" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
        <Tabs value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <TabsList aria-label="Filter offers by status" className="w-full justify-start sm:w-auto">
            {statuses.map((value) => <TabsTrigger key={value} value={value}>{value === 'ALL' ? 'All offers' : value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={status} aria-busy={list.isFetching}>
            <h2 className="sr-only">Offer activity</h2>
            {list.isPlaceholderData ? <p role="status" className="mb-3 text-xs text-muted">Updating offers…</p> : null}
            {list.isPending ? (
              <div className="grid divide-y divide-line-2" aria-label="Loading offers" aria-busy="true">
                {[0, 1, 2].map((key) => (
                  <div key={key} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="grid gap-2">
                      <div className="flex gap-2"><Skeleton className="h-5 w-2/5" /><Skeleton className="h-6 w-32 rounded-full" /></div>
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-11 w-32 rounded-full" />
                  </div>
                ))}
              </div>
            ) : null}
            {list.error ? <div><Alert variant="danger" role="alert">{isApiError(list.error) && list.error.code === 'AUTH_REQUIRED' ? 'Sign in to view your offers.' : 'We could not load your offers.'}</Alert><Button className="mt-3" type="button" variant="ghost" onClick={() => void list.refetch()}><RefreshCw aria-hidden="true" className="mr-2 size-4" />Try again</Button></div> : null}
            {!list.isPending && !list.error && offers.length === 0 ? (
              <div className="grid justify-items-center px-2 py-10 text-center" role="status">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-panel text-muted"><Clock3 aria-hidden="true" className="size-5" /></span>
                <h2 className="mt-3 font-extrabold text-ink">{status === 'ALL' ? 'No offers yet' : 'No offers in this status'}</h2>
                <p className="mt-1 text-sm text-muted">{status === 'ALL' ? 'Offers you send on marketplace errands will appear here.' : 'Try another status to see your other offers.'}</p>
                {status !== 'ALL' ? <Button type="button" variant="ghost" className="mt-4" onClick={() => setStatus('ALL')}>Show all offers</Button> : null}
              </div>
            ) : null}
            {groups.map((group) => group.rows.length ? (
              <section key={group.title} className="mt-4 first:mt-0" aria-labelledby={`offers-${group.title.replaceAll(' ', '-')}`}>
                <h2 id={`offers-${group.title.replaceAll(' ', '-')}`} className="rounded-lg bg-panel/70 px-3 py-2 text-xs font-extrabold text-muted">{group.title}</h2>
                <div className="divide-y divide-line-2">
                  {group.rows.map((offer) => {
                    const tone = offer.needsReconfirmation || (offer.status === 'ACTIVE' && offer.awaitingParty === 'RUNNER') ? 'bg-amber-bg text-amber' : offer.status === 'SELECTED' ? 'bg-ok-bg text-ok' : offer.status === 'ACTIVE' ? 'bg-blue-bg text-blue' : 'bg-panel text-muted';
                    const action = offer.status === 'ACTIVE' && offer.awaitingParty === 'RUNNER' ? 'Respond' : offer.status === 'SELECTED' ? 'Assignment details' : 'View offer';
                    return (
                      <article key={offer.id}>
                        <Link href={`/offers/${offer.id}`} aria-label={`${action}: ${offer.errandTitle}`} className="group grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-[var(--r-sm)] px-1 py-4 transition-colors hover:bg-panel/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center">
                          <span className={`grid size-10 place-items-center rounded-[13px] ${tone}`}><Tag aria-hidden="true" className="size-4" /></span>
                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-bold text-ink group-hover:text-green-900">{offer.errandTitle}</h3>
                            <p className="mt-1 break-words text-xs leading-relaxed text-muted">{[offer.pickupArea, offer.destinationArea].filter(Boolean).join(' → ') || 'Approximate locations unavailable'}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted"><span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="size-3" />{offer.durationMinutes} min</span><span>Sent <time dateTime={offer.createdAt}>{sentLabel(offer.createdAt)}</time></span></p>
                            {offer.closeReason ? <p className="mt-2 text-xs text-ink-2">Closed: {reasonLabel(offer.closeReason)}</p> : null}
                          </div>
                          <div className="col-start-2 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:col-start-3 sm:row-start-1 sm:max-w-64 sm:flex-col sm:items-end">
                            <span className="text-base font-extrabold tabular-nums text-ink">{money(offer.amountMinor)}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{labelFor(offer)}</span>
                            {offer.needsReconfirmation ? <span className="rounded-full bg-amber-bg px-2.5 py-1 text-[11px] font-bold text-amber">Reconfirm details</span> : null}
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-900">{action}<ArrowRight aria-hidden="true" className="size-3.5 transition-transform motion-safe:group-hover:translate-x-0.5" /></span>
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null)}
            {list.hasNextPage ? <div className="grid justify-items-center gap-2 py-2">{list.isFetchingNextPage ? <Skeleton className="h-20 w-full rounded-[var(--r-lg)]" aria-label="Loading more offers" /> : null}<Button type="button" variant="ghost" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>{list.isFetchingNextPage ? 'Loading…' : 'Load more offers'}</Button></div> : null}
            {list.isFetchNextPageError ? <Alert variant="danger" role="alert">We could not load the next page. <button type="button" className="font-bold underline" onClick={() => void list.fetchNextPage()}>Try again</button></Alert> : null}
          </TabsContent>
        </Tabs>
      </section>
      {limit.data ? <div className="flex items-start gap-3 rounded-[var(--r)] bg-tint p-4 text-xs leading-relaxed text-green-900"><Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><div><p><b>{limit.data.isPro ? 'Runner Pro' : 'Free plan'}:</b> {limit.data.used} of {limit.data.limit} new offers used today. Editing an offer or replying to a counter does not use another.</p><p className="mt-1 text-green-900/80">Resets {new Date(limit.data.resetsAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} (Lagos time).</p></div></div> : null}
    </main>
  );
}
