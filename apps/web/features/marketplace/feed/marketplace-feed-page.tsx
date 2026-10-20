'use client';

import { persistedQuery } from '@/lib/query/persisted-query';
import { useApiMutation } from '@/lib/query/mutations';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData, keepPreviousData } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { ArrowRight, Bookmark, ChevronRight, Clock3, MapPin, MessageSquare, Package, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { api, apiResponse, isApiError, type ApiResponse } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { PageHead } from '@/components/shell/page-head';
import { MarketplaceControls, categoryIcons } from '../marketplace-controls';

type FeedItem = components['schemas']['FeedItemDto'];
type MarketplaceFilterQuery = Record<string, string | number | boolean | string[] | undefined>;

const money = (minor: number | null) =>
  minor === null ? 'No budget' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

const dateLabel = (value: string) => new Date(value).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const timing = (item: FeedItem) => item.timeMode === 'ASAP' ? 'ASAP' : item.timeMode === 'SCHEDULED' ? 'Scheduled' : 'Time window';

function ErrandRoute({ item }: { item: FeedItem }) {
  return (
    <div className="grid gap-2.5 rounded-[var(--r-sm)] bg-panel px-3.5 py-3 text-xs text-ink-2">
      <div className="flex items-start gap-2.5"><span aria-hidden="true" className="mt-1 size-2.5 shrink-0 rounded-full bg-green" /><span><span className="sr-only">Pickup: </span>{item.pickup?.area ?? 'Pickup area: near you'}</span></div>
      <div className="flex items-start gap-2.5"><span aria-hidden="true" className="mt-1 size-2.5 shrink-0 rounded-sm bg-ink" /><span><span className="sr-only">Destination: </span>{item.destination?.area ?? 'Destination flexible'}</span></div>
    </div>
  );
}

function parseNumeric(value: string | null, fallback?: number) {
  if (value === null || value === '') return fallback ?? undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback ?? undefined;
}

function buildQueryFromSearch(searchParams: URLSearchParams): MarketplaceFilterQuery {
  const categoryValues = searchParams.getAll('category');
  const next: MarketplaceFilterQuery = {
    sort: searchParams.get('sort') ?? 'recommended',
    limit: 20,
  };

  if (categoryValues.length > 0) next.category = categoryValues;
  if (searchParams.get('timeMode')) next.timeMode = searchParams.get('timeMode') ?? undefined;
  if (searchParams.get('radiusKm')) next.radiusKm = parseNumeric(searchParams.get('radiusKm'));
  if (searchParams.get('budgetMin')) next.budgetMin = parseNumeric(searchParams.get('budgetMin'));
  if (searchParams.get('budgetMax')) next.budgetMax = parseNumeric(searchParams.get('budgetMax'));
  if (searchParams.get('q')) next.q = searchParams.get('q') ?? undefined;
  return next;
}

export function MarketplaceFeedPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters = useMemo(() => buildQueryFromSearch(searchParams), [searchParams]);
  const scrollKey = useMemo(() => `marketplace-feed-scroll:${searchParams.toString()}`, [searchParams]);
  const feedQueryKey = queryKeys.marketplace.feed(filters);

  const errands = useInfiniteQuery({
    queryKey: feedQueryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiResponse<FeedItem[]>('/marketplace/errands', {
      query: { ...filters, cursor: pageParam },
    }),
    getNextPageParam: (page) => page.meta?.nextCursor ?? undefined,
    retry: false,
    // Approximate areas only: the last first page may be shown again after a reload. A filter
    // change keeps the old rows on screen until the new ones arrive.
    placeholderData: keepPreviousData,
    ...persistedQuery('standard'),
  });

  const saveMutation = useApiMutation({ affects: ['marketplace'],
    mutationFn: async ({ errandId, saved }: { errandId: string; saved: boolean }) =>
      saved
        ? api<{ saved: boolean }>(`/saved-errands/${errandId}`, { method: 'DELETE' })
        : api<{ saved: boolean }>(`/saved-errands/${errandId}`, { method: 'POST' }),
    onSuccess: (result, { errandId }) => {
      queryClient.setQueriesData<InfiniteData<ApiResponse<FeedItem[]>>>(
        { queryKey: ['marketplace', 'feed'] },
        (current) => current && ({
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: page.data.map((item) => item.id === errandId ? { ...item, saved: result.saved } : item),
          })),
        }),
      );
      queryClient.setQueryData<components['schemas']['MarketplaceErrandDto'] | undefined>(
        queryKeys.marketplace.detail(errandId),
        (current) => current ? { ...current, saved: result.saved } : current,
      );
      if (!result.saved) {
        queryClient.setQueriesData<InfiniteData<ApiResponse<components['schemas']['SavedErrandItemDto'][]>>>(
          { queryKey: queryKeys.marketplace.saved() },
          (current) => current && ({
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              data: page.data.filter((item) => item.id !== errandId),
            })),
          }),
        );
      }
    },
  });

  const items = errands.data?.pages.flatMap((page) => page.data) ?? [];
  const total = errands.data?.pages[0]?.meta?.total;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const didRestoreScroll = useRef(false);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = errands;
  useEffect(() => {
    if (!errands.isSuccess || didRestoreScroll.current) return;
    didRestoreScroll.current = true;
    const savedPosition = window.sessionStorage.getItem(scrollKey);
    if (savedPosition) requestAnimationFrame(() => window.scrollTo({ top: Number(savedPosition) }));
  }, [errands.isSuccess, scrollKey]);
  useEffect(() => {
    const savePosition = () => window.sessionStorage.setItem(scrollKey, String(window.scrollY));
    window.addEventListener('pagehide', savePosition);
    return () => {
      window.removeEventListener('pagehide', savePosition);
      savePosition();
    };
  }, [scrollKey]);
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
    }, { rootMargin: '300px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  if (isApiError(errands.error) && errands.error.code === 'VERIFICATION_REQUIRED') {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <PageHead eyebrow="Marketplace" title="Find errands near you" />
        <section aria-labelledby="marketplace-verification-title" className="overflow-hidden rounded-[var(--r-lg)] bg-surface shadow-[var(--shadow)]">
          <div className="grid items-center gap-6 bg-gradient-to-br from-tint to-surface p-6 sm:grid-cols-[minmax(0,1fr)_232px] sm:p-8 lg:p-10">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-green-800">
                <ShieldCheck aria-hidden="true" className="size-4" />
                A trusted community
              </span>
              <h2 id="marketplace-verification-title" className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
                Your next errand starts here
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-2">
                Complete your runner verification to browse nearby errands and send offers. It helps requesters know who they can trust.
              </p>
              <Button asChild className="mt-5">
                <Link href="/verification">Continue verification<ArrowRight aria-hidden="true" /></Link>
              </Button>
            </div>
            <Image
              src="/assets/mascot-sprint.png"
              alt=""
              width={232}
              height={197}
              className="row-start-1 mx-auto h-auto w-44 sm:col-start-2 sm:row-start-1 sm:w-56"
            />
          </div>
        </section>
      </main>
    );
  }

  if (errands.error) {
    const error = errands.error;
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <PageHead eyebrow="Marketplace" title="Find errands near you" />
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>{isApiError(error) && error.code === 'RATE_LIMITED'
              ? 'You have made several feed requests. Please wait a moment before trying again.'
              : isApiError(error) && error.code === 'OFFER_NOT_ELIGIBLE'
                ? 'Your runner account is not currently eligible to browse errands.'
                : 'We could not load the marketplace feed.'}</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => void errands.refetch()}>Try again</Button>
            </div>
          </div>
        </Alert>
      </main>
    );
  }

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <MarketplaceControls
        count={typeof total === 'number' ? total : items.length}
        pending={errands.isPending}
        updating={errands.isFetching}
        hasMore={errands.hasNextPage && typeof total !== 'number'}
      />

      {errands.isPending ? (
        <section className="grid gap-3" aria-label="Loading errands" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] md:grid-cols-[minmax(0,1fr)_auto] sm:p-[22px]">
              <div className="grid gap-3">
                <div className="flex gap-2"><Skeleton className="h-6 w-24 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex gap-2 md:flex-col"><Skeleton className="h-10 w-24 rounded-full" /><Skeleton className="h-10 w-28 rounded-full" /></div>
            </div>
          ))}
        </section>
      ) : items.length === 0 ? (
        <div className="grid justify-items-center gap-2.5 rounded-[var(--r-lg)] bg-surface px-5 py-10 text-center shadow-[var(--shadow)]" role="status">
          <span aria-hidden="true" className="grid size-14 place-items-center rounded-[18px] bg-panel text-muted"><MapPin className="size-6" /></span>
          <p className="text-base font-extrabold text-ink">No errands match your filters right now.</p>
          <p className="mt-2 text-sm text-muted">Adjust your radius or search, or update your operating area to see more nearby requests.</p>
        </div>
      ) : (
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
          <section className="grid min-w-0 gap-3.5" aria-label="Marketplace errands" aria-busy={errands.isFetching}>
            {items.map((item) => {
              const Icon = categoryIcons[item.category.key] ?? Package;
              const active = selected?.id === item.id;
              return (
                <article key={item.id} className={`group relative grid min-w-0 gap-3.5 rounded-[var(--r-lg)] bg-surface p-5 shadow-[var(--shadow)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] motion-reduce:transform-none motion-reduce:transition-none ${active ? 'xl:ring-2 xl:ring-lime-600' : ''}`}>
                  <button type="button" aria-label={`Preview ${item.title}`} aria-pressed={active} aria-controls="marketplace-errand-preview" onClick={() => setSelectedId(item.id)} className="absolute inset-0 z-10 hidden cursor-pointer rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 xl:block" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-tint-2 px-2.5 py-1.5 text-[11px] font-extrabold text-green-900"><Icon aria-hidden="true" className="size-3.5" />{item.category.name}</span>{item.boosted && <span className="inline-flex items-center gap-1 rounded-full bg-amber-bg px-2 py-1.5 text-[10px] font-extrabold text-amber"><Sparkles aria-hidden="true" className="size-3" />Boosted</span>}</div>
                    <button type="button" aria-label={`${item.saved ? 'Unsave' : 'Save'} ${item.title}`} aria-pressed={item.saved} disabled={saveMutation.isPending && saveMutation.variables?.errandId === item.id} onClick={() => saveMutation.mutate({ errandId: item.id, saved: item.saved })} className={`relative z-20 grid size-10 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-50 motion-reduce:transition-none ${item.saved ? 'bg-tint-2 text-green-900' : 'bg-panel text-muted hover:bg-tint-2 hover:text-green-900'}`}><Bookmark aria-hidden="true" className={`size-[17px] ${item.saved ? 'fill-current' : ''}`} /><span className="sr-only">{saveMutation.isPending && saveMutation.variables?.errandId === item.id ? 'Saving…' : item.saved ? 'Saved' : 'Save'}</span></button>
                  </div>
                  <div className="min-w-0"><h2 className="text-base font-extrabold leading-snug tracking-tight text-ink">{item.title}</h2><p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p></div>
                  <ErrandRoute item={item} />
                  <div className="flex items-end justify-between gap-3">
                    <div className="grid gap-2 text-[11px] text-muted"><span className="flex flex-wrap items-center gap-x-2 gap-y-1">{item.distance && <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="size-3" />{item.distance.label}<span aria-hidden="true">·</span></span>}<span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="size-3" />{timing(item)}</span></span><span>Posted <time dateTime={item.postedAt}>{dateLabel(item.postedAt)}</time></span><span>Expires <time dateTime={item.expiresAt}>{dateLabel(item.expiresAt)}</time></span></div>
                    <div className="shrink-0 text-right"><p className="text-[22px] font-extrabold tracking-tight text-ink tabular-nums">{money(item.suggestedBudgetMinor)}</p><p className="mt-1 text-[11px] text-muted">{item.offerCount} {item.offerCount === 1 ? 'offer' : 'offers'}</p></div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="flex items-center gap-2 text-xs text-ink-2"><span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-panel text-[11px] font-extrabold text-green-800">{item.requester.firstName.slice(0, 1)}</span>{item.requester.firstName}{item.requester.rating !== null && <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Star aria-hidden="true" className="size-3 fill-amber text-amber" />{item.requester.rating.toFixed(1)}</span>}</span>
                    <div className="relative z-20 flex items-center gap-2"><Link href={`/marketplace/${item.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-bold text-ink-2 hover:bg-panel">View details<ChevronRight aria-hidden="true" className="size-3.5" /></Link><Link href={`/marketplace/${item.id}/offer`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-bold text-white transition-colors hover:bg-green-900 motion-reduce:transition-none">Send offer<ArrowRight aria-hidden="true" className="size-3.5" /></Link></div>
                  </div>
                </article>
              );
            })}
          </section>
          {selected && <aside id="marketplace-errand-preview" aria-label="Errand preview" tabIndex={0} className="sticky top-4 hidden h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto rounded-[var(--r-lg)] bg-surface shadow-[var(--shadow)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 xl:flex xl:flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-tint/60 px-5 py-4"><span className="inline-flex items-center gap-2 text-xs font-extrabold text-green-900"><Package aria-hidden="true" className="size-4" />Quick look</span><span className="text-[11px] text-muted">{selected.category.name}</span></div>
            <div key={selected.id} className="flex flex-1 flex-col gap-5 p-5">
              <div className="min-w-0"><h2 className="break-words text-lg font-extrabold leading-6 tracking-tight text-ink">{selected.title}</h2><p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-muted">{selected.description}</p></div>
              <ErrandRoute item={selected} />
              <dl className="divide-y divide-line text-xs">
                <div className="flex min-w-0 items-center justify-between gap-4 py-3"><dt className="text-muted">Suggested budget</dt><dd className="text-lg font-extrabold text-ink tabular-nums">{money(selected.suggestedBudgetMinor)}</dd></div>
                <div className="flex min-w-0 items-center justify-between gap-4 py-3"><dt className="text-muted">When</dt><dd className="text-right font-bold text-ink">{timing(selected)}{selected.scheduledAt && <span className="block text-[11px] font-normal text-muted">{dateLabel(selected.scheduledAt)}</span>}</dd></div>
                {selected.distance && <div className="flex min-w-0 items-center justify-between gap-4 py-3"><dt className="text-muted">Distance</dt><dd className="font-bold text-ink">{selected.distance.label}</dd></div>}
                <div className="flex min-w-0 items-center justify-between gap-4 py-3"><dt className="shrink-0 text-muted">Posted by</dt><dd className="min-w-0 text-right font-bold text-ink"><span className="block truncate" title={selected.requester.firstName}>{selected.requester.firstName}</span><span className="block text-[11px] font-normal text-muted">{selected.requester.rating === null ? 'No ratings yet' : `${selected.requester.rating.toFixed(1)} · ${selected.requester.ratingCount} reviews`}</span></dd></div>
                <div className="flex min-w-0 items-center justify-between gap-4 py-3"><dt className="inline-flex items-center gap-1.5 text-muted"><MessageSquare aria-hidden="true" className="size-3.5" />Offers so far</dt><dd className="font-bold text-ink">{selected.offerCount}</dd></div>
                <div className="flex min-w-0 items-center justify-between gap-4 py-3"><dt className="text-muted">Expires</dt><dd className="text-right font-bold text-ink"><time dateTime={selected.expiresAt}>{dateLabel(selected.expiresAt)}</time></dd></div>
              </dl>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                <Button asChild className="min-w-0 gap-1.5 px-3 text-xs"><Link href={`/marketplace/${selected.id}/offer`}>Send offer<ArrowRight aria-hidden="true" className="size-4" /></Link></Button>
                <Button variant="ghost" asChild className="min-w-0 gap-1.5 px-3 text-xs"><Link href={`/marketplace/${selected.id}`}>View details<ChevronRight aria-hidden="true" className="size-4" /></Link></Button>
              </div>
            </div>
          </aside>}
        </div>
      )}
      {errands.hasNextPage ? (
        <div ref={loadMoreRef} className="grid justify-items-center gap-2 py-3" aria-live="polite">
          {errands.isFetchingNextPage ? <Skeleton className="h-20 w-full rounded-[var(--r-lg)]" aria-label="Loading more errands" /> : null}
          <Button type="button" variant="ghost" disabled={errands.isFetchingNextPage} onClick={() => void errands.fetchNextPage()}>
            {errands.isFetchingNextPage ? 'Loading more…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </main>
  );
}
