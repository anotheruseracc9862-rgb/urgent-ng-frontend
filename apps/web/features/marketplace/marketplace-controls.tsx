'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@urgent/ui';
import { ArrowRight, Bookmark, Check, ChevronDown, ChevronRight, FileText, History, List, Map, MapPin, Package, Search, Settings2, ShoppingBag, SlidersHorizontal, X } from 'lucide-react';
import { PageHead } from '@/components/shell/page-head';
import { runnerApi } from '@/features/runner/api';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';

export const categoryIcons: Record<string, typeof Package> = { delivery: Package, pickup: MapPin, shopping_purchase: ShoppingBag, document: FileText };

export function MarketplaceControls({ count, pending, updating, hasMore = false }: {
  count: number;
  pending: boolean;
  updating: boolean;
  hasMore?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const categoryOptions = useQuery({
    queryKey: queryKeys.reference.categories(),
    queryFn: runnerApi.categories,
    staleTime: 60 * 60 * 1000,
  });
  const selectedCategories = searchParams.getAll('category');
  const searchTerm = searchParams.get('q') ?? '';
  const radiusValue = searchParams.get('radiusKm') ?? '';
  const budgetMin = searchParams.get('budgetMin') ?? '';
  const budgetMax = searchParams.get('budgetMax') ?? '';
  const sort = searchParams.get('sort') ?? 'recommended';
  const timeMode = searchParams.get('timeMode') ?? '';
  const advancedCount = [radiusValue, budgetMin, budgetMax, timeMode].filter(Boolean).length;
  const hasFilters = selectedCategories.length > 0 || Boolean(searchTerm) || advancedCount > 0;
  const mapView = searchParams.get('view') === 'map';
  const listParams = new URLSearchParams(searchParams.toString());
  listParams.delete('view');
  const mapParams = new URLSearchParams(listParams);
  mapParams.set('view', 'map');

  function updateUrl(next: Record<string, string | string[] | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ['category', 'timeMode', 'radiusKm', 'budgetMin', 'budgetMax', 'q', 'sort']) params.delete(key);
    const categories = Array.isArray(next.category) ? next.category : [];
    categories.forEach((value) => params.append('category', value));
    for (const key of ['timeMode', 'radiusKm', 'budgetMin', 'budgetMax', 'q', 'sort']) {
      if (next[key]) params.set(key, String(next[key]));
    }
    router.replace(params.size ? `/marketplace?${params}` : '/marketplace', { scroll: false });
  }

  function applyFilters(element: HTMLFormElement, category = selectedCategories) {
    const form = new FormData(element);
    updateUrl({
      category,
      timeMode: form.get('timeMode') === 'any' ? '' : String(form.get('timeMode') ?? ''),
      radiusKm: String(form.get('radiusKm') ?? ''),
      budgetMin: String(form.get('budgetMin') ?? ''),
      budgetMax: String(form.get('budgetMax') ?? ''),
      q: String(form.get('q') ?? ''),
      sort: String(form.get('sort') ?? 'recommended'),
    });
  }

  function onFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters(event.currentTarget);
  }

  function setCategories(category: string[]) {
    if (formRef.current?.reportValidity()) applyFilters(formRef.current, category);
  }

  return (
    <>
      <PageHead
        eyebrow="Runner"
        title="Find errands near you"
        description="Browse nearby requests and find work that fits your area and travel preferences."
        actions={<div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild><Link href="/runner/history"><History aria-hidden="true" className="size-4" />Job history</Link></Button>
          <Button type="button" variant="ghost" asChild><Link href="/runner/profile"><Settings2 aria-hidden="true" className="size-4" />Update profile</Link></Button>
        </div>}
      />
      <form ref={formRef} key={searchParams.toString()} onSubmit={onFilterSubmit} aria-label="Filter errands" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
        <div className={`grid min-w-0 gap-3 ${mapView ? 'sm:grid-cols-[minmax(0,1fr)_auto]' : 'sm:grid-cols-[minmax(0,1fr)_200px] xl:grid-cols-[minmax(0,1fr)_200px_auto]'}`}>
          <div className="flex min-w-0 items-center gap-2 rounded-full bg-panel pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-green-700">
            <Search aria-hidden="true" className="size-[18px] shrink-0 text-muted" />
            <label htmlFor="marketplace-search" className="sr-only">Search</label>
            <input id="marketplace-search" name="q" type="search" maxLength={100} defaultValue={searchTerm} placeholder="Search by title, area or item" className="min-h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
            <button type="submit" className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white transition-colors hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 motion-reduce:transition-none" aria-label="Search errands"><ArrowRight aria-hidden="true" className="size-4" /></button>
          </div>
          {mapView ? <input type="hidden" name="sort" value={sort} /> : <Select name="sort" defaultValue={sort}>
            <SelectTrigger aria-label="Sort" className="min-w-0 rounded-full border-line text-[13px] font-bold text-ink hover:bg-panel"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="nearest">Nearest</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="budget_desc">Budget high to low</SelectItem>
            </SelectContent>
          </Select>}
          <nav aria-label="Marketplace view" className={`flex w-fit items-center gap-1 rounded-full bg-panel p-1 ${mapView ? '' : 'sm:col-span-2 xl:col-span-1'}`}>
            <Link aria-label="List view" aria-current={!mapView ? 'page' : undefined} href={`/marketplace${listParams.size ? `?${listParams}` : ''}`} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-bold transition-colors motion-reduce:transition-none ${!mapView ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:bg-surface hover:text-ink'}`}><List aria-hidden="true" className="size-4" />List</Link>
            <Link aria-current={mapView ? 'page' : undefined} href={`/marketplace?${mapParams}`} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-bold transition-colors motion-reduce:transition-none ${mapView ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:bg-surface hover:text-ink'}`}><Map aria-hidden="true" className="size-4" />Map view</Link>
          </nav>
        </div>
        <fieldset className="mt-4 flex min-w-0 flex-wrap gap-2 border-t border-line pt-4">
          <legend className="sr-only">Categories</legend>
          <button type="button" aria-pressed={selectedCategories.length === 0} onClick={() => setCategories([])} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-bold transition-colors motion-reduce:transition-none ${selectedCategories.length === 0 ? 'bg-ink text-white' : 'bg-panel text-ink-2 hover:bg-tint-2'}`}>All categories</button>
          {(categoryOptions.data ?? []).map((category) => {
            const Icon = categoryIcons[category.key] ?? Package;
            const checked = selectedCategories.includes(category.key);
            return (
              <label key={category.id} className="relative cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(event) => setCategories(event.target.checked ? [...selectedCategories, category.key] : selectedCategories.filter((key) => key !== category.key))} className="peer sr-only" />
                <span className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-xs font-bold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-green-700 peer-focus-visible:ring-offset-2 motion-reduce:transition-none ${checked ? 'bg-ink text-white' : 'bg-panel text-ink-2 hover:bg-tint-2'}`}><Icon aria-hidden="true" className="size-3.5" />{category.name}{checked && <Check aria-hidden="true" className="size-3" />}</span>
              </label>
            );
          })}
        </fieldset>
        <div className="relative mt-4 border-t border-line pt-3">
          <details key={advancedCount > 0 ? 'filtered' : 'unfiltered'} open={advancedCount > 0 || undefined} className="group min-w-0">
            <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-2 rounded-full px-2 text-xs font-bold text-ink-2 hover:bg-panel [&::-webkit-details-marker]:hidden"><SlidersHorizontal aria-hidden="true" className="size-4" />More filters{advancedCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-tint-2 text-green-900">{advancedCount}</span>}<ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="grid content-start gap-1.5"><label htmlFor="marketplace-time" className="text-xs font-bold text-ink-2">Time mode</label><Select name="timeMode" defaultValue={timeMode || 'any'}><SelectTrigger id="marketplace-time" className="h-11 bg-panel text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any time</SelectItem><SelectItem value="ASAP">ASAP</SelectItem><SelectItem value="SCHEDULED">Scheduled</SelectItem></SelectContent></Select></div>
              <label className="grid gap-1.5 text-xs font-bold text-ink-2">Radius (km)<input name="radiusKm" defaultValue={radiusValue} type="number" min={1} max={20} step={1} placeholder="Any radius" className="min-h-11 min-w-0 w-full rounded-[var(--r-sm)] border border-line bg-panel px-3 text-sm font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" /></label>
              <label className="grid gap-1.5 text-xs font-bold text-ink-2">Min budget (kobo)<input name="budgetMin" defaultValue={budgetMin} type="number" min={0} step={500} placeholder="No minimum" className="min-h-11 min-w-0 w-full rounded-[var(--r-sm)] border border-line bg-panel px-3 text-sm font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" /></label>
              <label className="grid gap-1.5 text-xs font-bold text-ink-2">Max budget (kobo)<input name="budgetMax" defaultValue={budgetMax} type="number" min={0} step={500} placeholder="No maximum" className="min-h-11 min-w-0 w-full rounded-[var(--r-sm)] border border-line bg-panel px-3 text-sm font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" /></label>
            </div>
          </details>
          <Button type="submit" variant="ghost" className="absolute right-0 top-3 min-h-9 px-4 py-2 text-xs">Apply filters<ArrowRight aria-hidden="true" className="size-3.5" /></Button>
        </div>
      </form>
      {categoryOptions.error && <Alert variant="danger" role="alert">
        <p>We could not load errand categories.</p>
        {isApiError(categoryOptions.error) && categoryOptions.error.requestId && <p className="mt-1 text-xs">Request ID: {categoryOptions.error.requestId}</p>}
        <Button type="button" variant="ghost" className="mt-2" onClick={() => void categoryOptions.refetch()}>Try again</Button>
      </Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1.5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted" role="status" aria-live="polite">
          <span>{pending ? 'Finding errands…' : `${count} errand${count === 1 ? '' : 's'} ${hasMore ? 'loaded' : 'found'}`}</span>
          {updating && !pending && <span>Updating…</span>}
          {hasFilters && <button type="button" onClick={() => updateUrl({ sort })} className="inline-flex min-h-9 items-center gap-1.5 font-bold text-green-800 hover:underline"><X aria-hidden="true" className="size-3.5" />Clear filters</button>}
        </div>
        <Link href="/marketplace/saved" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface px-4 text-xs font-bold text-ink shadow-[var(--shadow)] transition-colors hover:bg-tint-2 motion-reduce:transition-none"><Bookmark aria-hidden="true" className="size-3.5" />Saved errands<ChevronRight aria-hidden="true" className="size-3.5 text-muted" /></Link>
      </div>
    </>
  );
}
