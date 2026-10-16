'use client';

import { persistedQuery } from '@/lib/query/persisted-query';
import { useApiMutation } from '@/lib/query/mutations';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData, keepPreviousData } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { ArrowRight, MapPin, Search, ShieldCheck } from 'lucide-react';
import { api, apiResponse, isApiError, type ApiResponse } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { runnerApi } from '@/features/runner/api';
import { PageHead } from '@/components/shell/page-head';

type FeedItem = components['schemas']['FeedItemDto'];
type MarketplaceFilterQuery = Record<string, string | number | boolean | string[] | undefined>;

const money = (minor: number | null) =>
  minor === null ? 'No budget' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const filters = useMemo(() => buildQueryFromSearch(searchParams), [searchParams]);
  const selectedCategories = useMemo(() => searchParams.getAll('category'), [searchParams]);
  const scrollKey = useMemo(() => `marketplace-feed-scroll:${searchParams.toString()}`, [searchParams]);
  const categoryOptions = useQuery({
    queryKey: queryKeys.reference.categories(),
    queryFn: runnerApi.categories,
    staleTime: 60 * 60 * 1000,
  });
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

  const updateUrl = (next: Record<string, string | string[] | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('category');
    params.delete('timeMode');
    params.delete('radiusKm');
    params.delete('budgetMin');
    params.delete('budgetMax');
    params.delete('q');
    params.delete('sort');

    const categoryValues = Array.isArray(next.category) ? next.category : [];
    categoryValues.forEach((value) => params.append('category', value));

    if (next.timeMode) params.set('timeMode', String(next.timeMode));
    if (next.radiusKm) params.set('radiusKm', String(next.radiusKm));
    if (next.budgetMin) params.set('budgetMin', String(next.budgetMin));
    if (next.budgetMax) params.set('budgetMax', String(next.budgetMax));
    if (next.q) params.set('q', String(next.q));
    if (next.sort) params.set('sort', String(next.sort));

    const query = params.toString();
    router.replace(query ? `/marketplace?${query}` : '/marketplace', { scroll: false });
  };

  const onFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formValues = {
      category: selectedCategories,
      timeMode: String(form.get('timeMode') ?? ''),
      radiusKm: String(form.get('radiusKm') ?? ''),
      budgetMin: String(form.get('budgetMin') ?? ''),
      budgetMax: String(form.get('budgetMax') ?? ''),
      q: String(form.get('q') ?? ''),
      sort: String(form.get('sort') ?? 'recommended'),
    };
    updateUrl(formValues);
  };

  const toggleCategory = (id: string, checked: boolean) => {
    const nextCategories = checked ? [...selectedCategories, id] : selectedCategories.filter((value) => value !== id);
    updateUrl({
      ...filters,
      category: nextCategories,
      timeMode: searchParams.get('timeMode') ?? undefined,
      radiusKm: searchParams.get('radiusKm') ?? undefined,
      budgetMin: searchParams.get('budgetMin') ?? undefined,
      budgetMax: searchParams.get('budgetMax') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      sort: searchParams.get('sort') ?? 'recommended',
    });
  };

  const searchTerm = searchParams.get('q') ?? '';
  const radiusValue = searchParams.get('radiusKm') ?? '';
  const budgetMin = searchParams.get('budgetMin') ?? '';
  const budgetMax = searchParams.get('budgetMax') ?? '';
  const sort = searchParams.get('sort') ?? 'recommended';
  const timeMode = searchParams.get('timeMode') ?? '';

  if (isApiError(errands.error) && errands.error.code === 'VERIFICATION_REQUIRED') {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <PageHead eyebrow="Marketplace" title="Find errands near you" />
        <section aria-labelledby="marketplace-verification-title" className="overflow-hidden rounded-[var(--r-lg)] bg-surface shadow-[var(--shadow)]">
          <div className="grid items-center gap-6 bg-gradient-to-br from-tint to-surface p-6 sm:grid-cols-[minmax(0,1fr)_180px] sm:p-8 lg:p-10">
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
              src="/assets/mascot.png"
              alt=""
              width={180}
              height={190}
              className="row-start-1 mx-auto h-36 w-auto sm:col-start-2 sm:row-start-1 sm:h-48"
            />
          </div>
        </section>
      </main>
    );
  }

  if (categoryOptions.error || errands.error) {
    const error = categoryOptions.error ?? errands.error;
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
            {isApiError(error) && error.requestId && <p className="text-xs">Request ID: {error.requestId}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => { void categoryOptions.refetch(); void errands.refetch(); }}>Try again</Button>
            </div>
          </div>
        </Alert>
      </main>
    );
  }

  const categories = categoryOptions.data ?? [];

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Runner"
        title="Find errands near you"
        description="Browse nearby requests and find work that fits your area and travel preferences."
        actions={<div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild><Link href={`/marketplace?${new URLSearchParams(searchParams.toString()).toString()}${searchParams.size ? '&' : ''}view=map`}>Map view</Link></Button>
          <Button type="button" variant="ghost" asChild><Link href="/marketplace/saved">Saved errands</Link></Button>
          <Button type="button" variant="ghost" asChild><Link href="/runner/history">Job history</Link></Button>
          <Button type="button" variant="ghost" asChild><Link href="/runner/profile">Update profile</Link></Button>
        </div>}
      />

      <form onSubmit={onFilterSubmit} className="grid min-w-0 gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] md:grid-cols-[minmax(0,1.3fr)_220px_180px_180px_180px_140px]">
        <div className="flex items-center gap-2 text-sm font-extrabold text-ink md:col-span-6">
          <Search aria-hidden="true" className="size-4 text-muted" />
          Refine your search
        </div>
        <label className="grid gap-1 text-sm font-bold text-ink">
          Search
          <input name="q" defaultValue={searchTerm} placeholder="e.g. pharmacy" className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" />
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">
          Sort
          <select name="sort" defaultValue={sort} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700">
            <option value="recommended">Recommended</option>
            <option value="nearest">Nearest</option>
            <option value="newest">Newest</option>
            <option value="budget_desc">Budget high to low</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">
          Time mode
          <select name="timeMode" defaultValue={timeMode} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700">
            <option value="">Any</option>
            <option value="ASAP">ASAP</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="WINDOW">Window</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">
          Radius
          <input name="radiusKm" defaultValue={radiusValue} type="number" min={1} max={20} step={1} placeholder="5 km" className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" />
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">
          Min budget
          <input name="budgetMin" defaultValue={budgetMin} type="number" min={0} step={500} placeholder="5000" className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" />
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">
          Max budget
          <input name="budgetMax" defaultValue={budgetMax} type="number" min={0} step={500} placeholder="50000" className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" />
        </label>

        <div className="md:col-span-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">Categories</span>
            {selectedCategories.length > 0 ? <button type="button" className="text-xs font-bold text-green-800 underline" onClick={() => updateUrl({ sort, q: searchTerm || undefined, timeMode: timeMode || undefined, radiusKm: radiusValue || undefined, budgetMin: budgetMin || undefined, budgetMax: budgetMax || undefined, category: [] })}>Clear</button> : null}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <label key={category.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--r-sm)] bg-panel px-3 py-2 text-sm text-ink transition-colors hover:bg-tint motion-reduce:transition-none">
                <input type="checkbox" checked={selectedCategories.includes(category.id)} onChange={(event) => toggleCategory(category.id, event.target.checked)} className="size-4 accent-lime-700" />
                {category.name}
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-6 flex justify-end">
          <Button type="submit">Apply filters</Button>
        </div>
      </form>

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
        <section className="grid gap-3" aria-label="Marketplace errands">
          {items.map((item) => (
            <article key={item.id} className="grid min-w-0 gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] md:grid-cols-[minmax(0,1fr)_auto] sm:p-[22px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {item.boosted && <span className="rounded-full bg-amber-bg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber">Boosted</span>}
                  <span className="rounded-full bg-tint-2 px-2.5 py-1 text-[11px] font-extrabold text-green-900">{item.category.name}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{item.timeMode}</span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/marketplace/${item.id}`} className="text-base font-extrabold tracking-tight text-ink hover:underline">{item.title}</Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-panel px-2.5 py-1 text-xs font-bold text-ink">{money(item.suggestedBudgetMinor)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                  <span>{item.pickup?.area ?? 'Pickup area: near you'}</span>
                  <span>{item.destination?.area ?? 'Destination flexible'}</span>
                  {item.distance ? <span>{item.distance.label}</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>{item.offerCount} offers</span>
                  <span>Posted {new Date(item.postedAt).toLocaleDateString()}</span>
                  <span>Expires {new Date(item.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  disabled={saveMutation.isPending && saveMutation.variables?.errandId === item.id}
                  onClick={() => saveMutation.mutate({ errandId: item.id, saved: item.saved })}
                  className={`min-h-11 rounded-full px-3 text-xs font-extrabold uppercase tracking-wide ${item.saved ? 'bg-green-700 text-white' : 'bg-panel text-ink'}`}
                >
                  {saveMutation.isPending && saveMutation.variables?.errandId === item.id ? 'Saving…' : item.saved ? 'Saved' : 'Save'}
                </button>
                <Link href={`/marketplace/${item.id}/offer`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-4 text-xs font-extrabold text-white">
                  Send offer
                </Link>
              </div>
            </article>
          ))}
        </section>
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
