'use client';

import { persistedQuery } from '@/lib/query/persisted-query';
import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowRight, Clock3, RefreshCw } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type RunnerOffer } from '../api';
import { PageHead } from '@/components/shell/page-head';

type StatusFilter = RunnerOffer['status'] | 'ALL';
const statuses: StatusFilter[] = ['ALL', 'ACTIVE', 'SELECTED', 'WITHDRAWN', 'REJECTED', 'EXPIRED', 'CLOSED'];

const money = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

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
  const [status, setStatus] = useState<StatusFilter>('ALL');
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
        actions={<Button type="button" variant="ghost" asChild><Link href="/marketplace">Browse errands</Link></Button>}
      />
      <section className="flex flex-col gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between sm:px-[22px]">
        <div>
          <h2 className="text-sm font-extrabold text-ink">Offer activity</h2>
          <p className="mt-1 text-xs text-muted">Offers are grouped by the response or action needed next.</p>
        </div>
        <label className="grid gap-1 text-xs font-bold text-muted">Filter by status
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700">
            {statuses.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All offers' : value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}
          </select>
        </label>
      </section>

      {list.isPending ? (
        <div className="grid gap-3" aria-label="Loading offers" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-[22px]">
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
        <section className="grid justify-items-center rounded-[var(--r-lg)] bg-surface px-5 py-10 text-center shadow-[var(--shadow)]" role="status">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-panel text-muted"><Clock3 aria-hidden="true" className="size-5" /></span>
          <h2 className="mt-3 font-extrabold text-ink">No offers yet</h2>
          <p className="mt-1 text-sm text-muted">Offers you send on marketplace errands will appear here.</p>
          <Button asChild className="mt-4"><Link href="/marketplace">Browse errands</Link></Button>
        </section>
      ) : null}
      {groups.map((group) => group.rows.length ? (
        <section key={group.title} className="grid gap-3" aria-labelledby={`offers-${group.title.replaceAll(' ', '-')}`}>
          <h2 id={`offers-${group.title.replaceAll(' ', '-')}`} className="px-1.5 text-sm font-extrabold text-ink">{group.title}</h2>
          {group.rows.map((offer) => (
            <article key={offer.id} className="grid min-w-0 gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-[22px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-base font-extrabold tracking-tight text-ink">{offer.errandTitle}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${offer.status === 'ACTIVE' ? 'bg-amber-bg text-amber' : offer.status === 'SELECTED' ? 'bg-green-bg text-green-900' : 'bg-panel text-muted'}`}>{labelFor(offer)}</span>
                  {offer.needsReconfirmation ? <span className="rounded-full bg-amber-bg px-2.5 py-1 text-xs font-bold text-amber">Reconfirm details</span> : null}
                </div>
                <p className="mt-1 text-sm text-muted">{money(offer.amountMinor)} · {offer.durationMinutes} min</p>
                <p className="mt-1 text-xs text-muted">{[offer.pickupArea, offer.destinationArea].filter(Boolean).join(' → ') || 'Approximate locations unavailable'}</p>
                {offer.closeReason ? <p className="mt-2 text-sm text-ink-2">Closed: {reasonLabel(offer.closeReason)}</p> : null}
              </div>
              <Button asChild variant={offer.status === 'ACTIVE' && offer.awaitingParty === 'RUNNER' ? 'primary' : 'ghost'}>
                <Link href={`/offers/${offer.id}`}>{offer.status === 'ACTIVE' && offer.awaitingParty === 'RUNNER' ? 'Respond' : offer.status === 'SELECTED' ? 'Assignment details' : 'View offer'}<ArrowRight aria-hidden="true" className="ml-2 size-4" /></Link>
              </Button>
            </article>
          ))}
        </section>
      ) : null)}
      {list.hasNextPage ? <div className="grid justify-items-center gap-2 py-2">{list.isFetchingNextPage ? <Skeleton className="h-20 w-full rounded-[var(--r-lg)]" aria-label="Loading more offers" /> : null}<Button type="button" variant="ghost" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>{list.isFetchingNextPage ? 'Loading…' : 'Load more offers'}</Button></div> : null}
      {list.isFetchNextPageError ? <Alert variant="danger" role="alert">We could not load the next page. <button type="button" className="font-bold underline" onClick={() => void list.fetchNextPage()}>Try again</button></Alert> : null}
    </main>
  );
}
