'use client';

import { estimateLabel } from '@/components/forms/duration-input';
import { persistedQuery } from '@/lib/query/persisted-query';
import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowRight, Clock3, RefreshCw, Star, Tag } from 'lucide-react';
import { Alert, Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { PageHead } from '@/components/shell/page-head';
import { RequesterWorkSwitch } from '@/components/requester/work-switch';
import { isService } from '@/features/reference/flow';
import { offersApi, type RequesterOffer } from '../api';

type StatusFilter = RequesterOffer['status'] | 'ALL';
const statuses: StatusFilter[] = ['ALL', 'ACTIVE', 'SELECTED', 'WITHDRAWN', 'REJECTED', 'EXPIRED', 'CLOSED'];

const money = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

const sentLabel = (date: string) => new Date(date).toLocaleString('en-NG', {
  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
});

const title = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const GROUPS = ['Waiting for you', 'Waiting for the runner', 'Agreed', 'Selected', 'Closed'] as const;
type Group = (typeof GROUPS)[number];

/** Where the offer stands for the requester. */
export function requesterGroup(offer: Pick<RequesterOffer, 'status' | 'awaitingParty'>): Group {
  if (offer.status === 'ACTIVE' && offer.awaitingParty === 'REQUESTER') return 'Waiting for you';
  if (offer.status === 'ACTIVE' && offer.awaitingParty === 'RUNNER') return 'Waiting for the runner';
  if (offer.status === 'ACTIVE') return 'Agreed';
  if (offer.status === 'SELECTED') return 'Selected';
  return 'Closed';
}

function labelFor(offer: RequesterOffer) {
  const group = requesterGroup(offer);
  if (group === 'Waiting for you') return offer.needsReconfirmation ? 'Runner is reconfirming' : 'New offer · Your move';
  if (group === 'Waiting for the runner') return 'Counter sent · Runner’s move';
  if (group === 'Agreed') return 'Agreed · Ready to select';
  return title(offer.status);
}

/** Every offer on the requester's errands in one place, with the ones that need an answer first. */
export function RequesterOffersPage() {
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const list = useInfiniteQuery({
    queryKey: queryKeys.requester.offers({ status }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => offersApi.requesterOffers({
      ...(status === 'ALL' ? {} : { status }),
      cursor: pageParam,
      limit: 20,
    }),
    getNextPageParam: (page) => page.meta?.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    ...persistedQuery('standard'),
  });

  const offers = list.data?.pages.flatMap((page) => page.data) ?? [];
  const groups = GROUPS.map((group) => ({ title: group, rows: offers.filter((offer) => requesterGroup(offer) === group) }));
  const waiting = groups[0].rows.length;

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Requester"
        title="Offers"
        description="Every offer on your errands in one place. The ones waiting for your answer come first."
      />
      <RequesterWorkSwitch current="offers" />
      {waiting ? (
        <Alert variant="info" role="status">
          <p className="font-extrabold">{waiting} {waiting === 1 ? 'offer is' : 'offers are'} waiting for you</p>
          <p className="mt-1">Choose a runner, counter the price, or decline.</p>
        </Alert>
      ) : null}

      <section aria-label="Offer activity" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
        <Tabs value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <TabsList aria-label="Filter offers by status" className="w-full justify-start sm:w-auto">
            {statuses.map((value) => <TabsTrigger key={value} value={value}>{value === 'ALL' ? 'All offers' : title(value)}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={status} aria-busy={list.isFetching}>
            <h2 className="sr-only">Offer activity</h2>
            {list.isPlaceholderData ? <p role="status" className="mb-3 text-xs text-muted">Updating offers…</p> : null}
            {list.isPending ? (
              <div className="grid divide-y divide-line-2" aria-label="Loading offers" aria-busy="true">
                {[0, 1, 2].map((key) => (
                  <div key={key} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="grid gap-2"><Skeleton className="h-5 w-2/5" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/2" /></div>
                    <Skeleton className="h-11 w-32 rounded-full" />
                  </div>
                ))}
              </div>
            ) : null}
            {list.error ? (
              <div>
                <Alert variant="danger" role="alert">{isApiError(list.error) && list.error.code === 'AUTH_REQUIRED' ? 'Sign in to view your offers.' : 'We could not load your offers.'}</Alert>
                <Button className="mt-3" type="button" variant="ghost" onClick={() => void list.refetch()}><RefreshCw aria-hidden="true" className="mr-2 size-4" />Try again</Button>
              </div>
            ) : null}
            {!list.isPending && !list.error && offers.length === 0 ? (
              <div className="grid justify-items-center px-2 py-10 text-center" role="status">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-panel text-muted"><Tag aria-hidden="true" className="size-5" /></span>
                <h2 className="mt-3 font-extrabold text-ink">{status === 'ALL' ? 'No offers yet' : 'No offers in this status'}</h2>
                <p className="mt-1 text-sm text-muted">{status === 'ALL' ? 'When runners make offers on your errands, they appear here.' : 'Try another status to see your other offers.'}</p>
                {status !== 'ALL'
                  ? <Button type="button" variant="ghost" className="mt-4" onClick={() => setStatus('ALL')}>Show all offers</Button>
                  : <Button asChild className="mt-4"><Link href="/errands">Go to my errands</Link></Button>}
              </div>
            ) : null}
            {groups.map((group) => group.rows.length ? (
              <section key={group.title} className="mt-4 first:mt-0" aria-labelledby={`requester-offers-${group.title.replaceAll(' ', '-')}`}>
                <h2 id={`requester-offers-${group.title.replaceAll(' ', '-')}`} className="rounded-lg bg-panel/70 px-3 py-2 text-xs font-extrabold text-muted">{group.title} · {group.rows.length}</h2>
                <div className="divide-y divide-line-2">
                  {group.rows.map((offer) => {
                    const yourMove = requesterGroup(offer) === 'Waiting for you';
                    const tone = yourMove ? 'bg-amber-bg text-amber' : offer.status === 'SELECTED' ? 'bg-ok-bg text-ok' : offer.status === 'ACTIVE' ? 'bg-blue-bg text-blue' : 'bg-panel text-muted';
                    const action = yourMove ? 'Review offer' : offer.status === 'SELECTED' ? 'View errand' : 'View offer';
                    const href = offer.status === 'SELECTED' ? `/errands/${offer.errandId}` : `/offers/${offer.id}`;
                    const unit = isService(offer.categoryFlow) ? ['job', 'jobs'] : ['errand', 'errands'];
                    return (
                      <article key={offer.id}>
                        <Link href={href} aria-label={`${action}: ${offer.errandTitle}, offer from ${offer.runnerFirstName}`} className="group grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-[var(--r-sm)] px-1 py-4 transition-colors hover:bg-panel/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center">
                          <span className={`grid size-10 place-items-center rounded-[13px] ${tone}`}><Tag aria-hidden="true" className="size-4" /></span>
                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-bold text-ink group-hover:text-green-900">{offer.errandTitle}</h3>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
                              <span className="font-bold">{offer.runnerFirstName}</span>
                              {offer.runnerRating !== null
                                ? <span className="inline-flex items-center gap-1 text-muted"><Star aria-hidden="true" className="size-3" />{offer.runnerRating.toFixed(1)}</span>
                                : <span className="text-muted">No rating yet</span>}
                              <span className="text-muted">· {offer.runnerCompletedErrands} {offer.runnerCompletedErrands === 1 ? unit[0] : unit[1]} done</span>
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted"><span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="size-3" />{estimateLabel(offer.durationMinutes)}</span><span>Sent <time dateTime={offer.createdAt}>{sentLabel(offer.createdAt)}</time></span></p>
                            {offer.closeReason ? <p className="mt-2 text-xs text-ink-2">Closed: {title(offer.closeReason)}</p> : null}
                          </div>
                          <div className="col-start-2 flex min-w-0 flex-wrap items-center justify-between gap-2 max-sm:col-span-2 max-sm:col-start-1 sm:col-start-3 sm:row-start-1 sm:max-w-64 sm:flex-col sm:items-end">
                            <span className="text-base font-extrabold tabular-nums text-ink">{money(offer.amountMinor)}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold max-sm:max-w-full max-sm:text-right ${tone}`}>{labelFor(offer)}</span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-900 max-sm:min-h-11 max-sm:basis-full max-sm:justify-center max-sm:rounded-full max-sm:bg-panel">{action}<ArrowRight aria-hidden="true" className="size-3.5 transition-transform motion-safe:group-hover:translate-x-0.5" /></span>
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
    </main>
  );
}
