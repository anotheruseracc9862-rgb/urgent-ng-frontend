'use client';

import { persistedQuery } from '@/lib/query/persisted-query';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError, type ApiResponse } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { marketplaceApi, type FeedItem, type SavedErrand } from '../api';

function money(minor: number | null) {
  return minor === null
    ? 'No budget'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
}

function statusLabel(status: components['schemas']['ErrandStatus']) {
  return status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SavedErrandsPage() {
  const queryClient = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: queryKeys.marketplace.saved(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => marketplaceApi.saved(pageParam),
    getNextPageParam: (page) => page.meta?.nextCursor ?? undefined,
    retry: false,
    ...persistedQuery('standard'),
  });
  const remove = useApiMutation({ affects: ['marketplace'],
    mutationFn: (errandId: string) => marketplaceApi.setSaved(errandId, false),
    onSuccess: async (_result, errandId) => {
      queryClient.setQueryData<InfiniteData<ApiResponse<SavedErrand[]>>>(
        queryKeys.marketplace.saved(),
        (current) => current && ({
          ...current,
          pages: current.pages.map((page) => ({ ...page, data: page.data.filter((item) => item.id !== errandId) })),
        }),
      );
      queryClient.setQueriesData<InfiniteData<ApiResponse<FeedItem[]>>>(
        { queryKey: ['marketplace', 'feed'] },
        (current) => current && ({
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: page.data.map((item) => item.id === errandId ? { ...item, saved: false } : item),
          })),
        }),
      );
      queryClient.setQueryData<components['schemas']['MarketplaceErrandDto'] | undefined>(
        queryKeys.marketplace.detail(errandId),
        (current) => current ? { ...current, saved: false } : current,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.saved() });
    },
  });

  const errands = list.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <main className="mx-auto grid max-w-5xl gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--r-lg)] border border-line bg-tint p-4 shadow-[var(--shadow)] sm:p-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Runner workspace</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">Saved errands</h1>
          <p className="mt-2 text-sm text-muted">Open errands can still receive offers. Closed errands remain visible for reference.</p>
        </div>
        <Button asChild variant="ghost"><Link href="/marketplace">Browse marketplace</Link></Button>
      </header>

      {list.isPending ? <div className="grid gap-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-36 rounded-[var(--r-lg)]" />)}</div> : null}
      {list.error ? (
        <Alert variant="danger" role="alert">
          <p>{isApiError(list.error) && list.error.code === 'RESOURCE_NOT_FOUND' ? 'Saved errands are not available to this account.' : 'We could not load saved errands.'}</p>
          {isApiError(list.error) && list.error.requestId ? <p className="mt-1 text-xs">Request ID: {list.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void list.refetch()}>Try again</Button>
        </Alert>
      ) : null}
      {!list.isPending && !list.error && errands.length === 0 ? (
        <section className="rounded-[var(--r-lg)] border border-dashed border-line bg-surface p-8 text-center">
          <h2 className="font-extrabold text-ink">No saved errands</h2>
          <p className="mt-2 text-sm text-muted">Save an errand from the marketplace to keep it here.</p>
          <Button asChild className="mt-4"><Link href="/marketplace">Find errands</Link></Button>
        </section>
      ) : null}
      <section className="grid gap-3">
        {errands.map((item) => (
          <SavedErrandCard key={item.id} item={item} removing={remove.isPending && remove.variables === item.id} onRemove={() => remove.mutate(item.id)} />
        ))}
      </section>
      {remove.error ? <Alert variant="danger" role="alert">{isApiError(remove.error) ? remove.error.message : 'We could not remove this errand from your saved list.'}</Alert> : null}
      {list.hasNextPage ? (
        <Button type="button" variant="ghost" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </main>
  );
}

function SavedErrandCard({ item, removing, onRemove }: { item: SavedErrand; removing: boolean; onRemove: () => void }) {
  const isOpen = item.status === 'OPEN';
  return (
    <article className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800">{item.category.name}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isOpen ? 'bg-green-bg text-green-900' : 'bg-panel text-muted'}`}>{statusLabel(item.status)}</span>
          {item.boosted ? <span className="rounded-full bg-amber-bg px-2.5 py-1 text-xs font-bold text-amber">Boosted</span> : null}
        </div>
        <h2 className="mt-2 text-lg font-extrabold text-ink">
          {isOpen ? <Link href={`/marketplace/${item.id}`} className="hover:underline">{item.title}</Link> : item.title}
        </h2>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>
        <p className="mt-2 text-sm text-ink-2">{item.pickup?.area ?? 'Pickup area unavailable'}{item.destination?.area ? ` → ${item.destination.area}` : ''}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
          <span>{money(item.suggestedBudgetMinor)}</span>
          {item.distance ? <span>{item.distance.label}</span> : null}
          <span>{item.offerCount} offers</span>
          <span>Saved {new Date(item.savedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex flex-row items-start gap-2 sm:flex-col sm:items-end">
        <Button type="button" variant="ghost" disabled={removing} onClick={onRemove}>{removing ? 'Removing…' : 'Remove'}</Button>
        {isOpen ? <Button asChild><Link href={`/marketplace/${item.id}/offer`}>Send offer</Link></Button> : null}
      </div>
    </article>
  );
}
