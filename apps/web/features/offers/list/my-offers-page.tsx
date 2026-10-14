'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowRight, Clock3, RefreshCw } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type RunnerOffer } from '../api';

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
    <main className="mx-auto grid max-w-5xl gap-4">
      <header className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-line bg-tint p-4 shadow-[var(--shadow)] sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div><p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Runner workspace</p><h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">My offers</h1><p className="mt-2 text-sm text-muted">Track replies, respond to counters and review closed offers.</p></div>
        <label className="grid gap-1 text-xs font-bold text-muted">Filter by status
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="min-h-10 rounded-full border border-line bg-surface px-3 text-sm text-ink">
            {statuses.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All offers' : value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}
          </select>
        </label>
      </header>

      {list.isLoading ? <div className="grid gap-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-32 rounded-[var(--r-lg)]" />)}</div> : null}
      {list.error ? <div><Alert variant="danger" role="alert">{isApiError(list.error) && list.error.code === 'AUTH_REQUIRED' ? 'Sign in to view your offers.' : 'We could not load your offers.'}</Alert><Button className="mt-3" type="button" variant="ghost" onClick={() => void list.refetch()}><RefreshCw aria-hidden="true" className="mr-2 size-4" />Try again</Button></div> : null}
      {!list.isLoading && !list.error && offers.length === 0 ? (
        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-8 text-center shadow-[var(--shadow)]">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-panel text-muted"><Clock3 aria-hidden="true" className="size-5" /></span>
          <h2 className="mt-3 font-extrabold text-ink">No offers yet</h2>
          <p className="mt-1 text-sm text-muted">Offers you send on marketplace errands will appear here.</p>
          <Button asChild className="mt-4"><Link href="/marketplace">Browse errands</Link></Button>
        </section>
      ) : null}
      {groups.map((group) => group.rows.length ? (
        <section key={group.title} className="grid gap-3" aria-labelledby={`offers-${group.title.replaceAll(' ', '-')}`}>
          <h2 id={`offers-${group.title.replaceAll(' ', '-')}`} className="text-sm font-extrabold uppercase tracking-wide text-muted">{group.title}</h2>
          {group.rows.map((offer) => (
            <article key={offer.id} className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words font-extrabold text-ink">{offer.errandTitle}</h3>
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
      {list.hasNextPage ? <div className="text-center"><Button type="button" variant="ghost" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>{list.isFetchingNextPage ? 'Loading…' : 'Load more offers'}</Button></div> : null}
      {list.isFetchNextPageError ? <Alert variant="danger" role="alert">We could not load the next page. <button type="button" className="font-bold underline" onClick={() => void list.fetchNextPage()}>Try again</button></Alert> : null}
    </main>
  );
}
