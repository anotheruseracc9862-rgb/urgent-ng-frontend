'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { runnerApi } from '@/features/runner/api';
import { marketplaceApi, type MapPoint, type MarketplaceFilters } from '../api';
import { useMapProvider } from '@/components/map/MapProvider';

function filtersFromSearch(search: URLSearchParams): MarketplaceFilters {
  const number = (key: string) => {
    const value = search.get(key);
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    category: search.getAll('category'),
    timeMode: search.get('timeMode') || undefined,
    budgetMin: number('budgetMin'),
    budgetMax: number('budgetMax'),
    radiusKm: number('radiusKm'),
    q: search.get('q') || undefined,
  };
}

function clusterPoints(points: MapPoint[]) {
  const groups = new Map<string, MapPoint[]>();
  for (const point of points) {
    const key = `${Math.round(point.approx.lat * 100)}:${Math.round(point.approx.lng * 100)}`;
    groups.set(key, [...(groups.get(key) ?? []), point]);
  }
  return [...groups.values()];
}

function money(minor: number | null) {
  return minor === null
    ? 'No budget'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
}

export function MarketplaceMapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { libraries, error: mapError } = useMapProvider();
  const [selected, setSelected] = useState<MapPoint[] | null>(null);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const filters = useMemo(() => filtersFromSearch(new URLSearchParams(searchParams.toString())), [searchParams]);
  const query = useQuery({
    queryKey: queryKeys.marketplace.map({ ...filters }),
    queryFn: () => marketplaceApi.map(filters),
    retry: false,
  });
  const categories = useQuery({
    queryKey: queryKeys.reference.categories(),
    queryFn: runnerApi.categories,
    staleTime: 60 * 60 * 1000,
  });
  const points = useMemo(() => query.data?.data ?? [], [query.data]);

  useEffect(() => {
    if (!libraries || !mapElement.current) return;
    const map = new libraries.maps.Map(mapElement.current, {
      center: { lat: 6.5244, lng: 3.3792 },
      zoom: 12,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'cooperative',
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });
    mapInstance.current = map;
    return () => { mapInstance.current = null; };
  }, [libraries]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!libraries || !map) return;
    const markers = clusterPoints(points).map((group) => {
      const marker = new libraries.marker.Marker({
        map,
        position: group[0].approx,
        title: group.length > 1 ? `${group.length} errands in this approximate area` : group[0].title,
        label: group.length > 1 ? String(group.length) : undefined,
      });
      const listener = marker.addListener('click', () => setSelected(group));
      return { marker, listener };
    });
    if (points.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((point) => bounds.extend(point.approx));
      map.fitBounds(bounds, 48);
      const listener = map.addListener('idle', () => {
        if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
      });
      return () => {
        listener.remove();
        markers.forEach(({ marker, listener: markerListener }) => {
          markerListener.remove();
          marker.setMap(null);
        });
      };
    }
    return () => markers.forEach(({ marker, listener }) => {
      listener.remove();
      marker.setMap(null);
    });
  }, [libraries, points]);

  function updateFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ['q', 'timeMode', 'radiusKm', 'budgetMin', 'budgetMax']) params.delete(key);
    for (const key of ['q', 'timeMode', 'radiusKm', 'budgetMin', 'budgetMax']) {
      const value = String(form.get(key) ?? '').trim();
      if (value) params.set(key, value);
    }
    router.replace(`/marketplace?${params.toString()}`, { scroll: false });
  }

  function toggleCategory(id: string, checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll('category').filter((value) => value !== id);
    params.delete('category');
    [...current, ...(checked ? [id] : [])].forEach((value) => params.append('category', value));
    router.replace(`/marketplace?${params.toString()}`, { scroll: false });
  }

  const feedParams = new URLSearchParams(searchParams.toString());
  feedParams.delete('view');
  const categoriesData = categories.data ?? [];

  return (
    <main className="mx-auto grid max-w-6xl gap-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Marketplace map</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">Errands near you</h1>
          <p className="mt-1 text-sm text-muted">Pins show approximate areas, never exact addresses.</p>
        </div>
        <Button asChild variant="ghost"><Link href={`/marketplace${feedParams.size ? `?${feedParams}` : ''}`}>List view</Link></Button>
      </header>

      <form onSubmit={updateFilters} className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-1 text-sm font-bold text-ink">Search
          <input name="q" defaultValue={filters.q ?? ''} className="min-h-11 rounded-lg border border-line bg-panel px-3 text-sm" />
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">Time mode
          <select name="timeMode" defaultValue={filters.timeMode ?? ''} className="min-h-11 rounded-lg border border-line bg-panel px-3 text-sm">
            <option value="">Any</option><option value="ASAP">ASAP</option><option value="SCHEDULED">Scheduled</option><option value="WINDOW">Window</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">Radius (km)
          <input name="radiusKm" type="number" min={1} max={20} defaultValue={filters.radiusKm ?? ''} className="min-h-11 rounded-lg border border-line bg-panel px-3 text-sm" />
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">Min budget
          <input name="budgetMin" type="number" min={0} defaultValue={filters.budgetMin ?? ''} className="min-h-11 rounded-lg border border-line bg-panel px-3 text-sm" />
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">Max budget
          <input name="budgetMax" type="number" min={0} defaultValue={filters.budgetMax ?? ''} className="min-h-11 rounded-lg border border-line bg-panel px-3 text-sm" />
        </label>
        {categoriesData.length ? (
          <fieldset className="grid gap-2 sm:col-span-2 lg:col-span-5">
            <legend className="text-xs font-extrabold uppercase tracking-wide text-muted">Categories</legend>
            <div className="flex flex-wrap gap-2">
              {categoriesData.map((category) => (
                <label key={category.id} className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm">
                  <input type="checkbox" checked={filters.category?.includes(category.id) ?? false} onChange={(event) => toggleCategory(category.id, event.target.checked)} />
                  {category.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <div className="sm:col-span-2 lg:col-span-5"><Button type="submit">Apply filters</Button></div>
      </form>

      {query.isLoading ? <Skeleton className="h-[55vh] min-h-72 rounded-[var(--r-lg)]" aria-label="Loading map errands" /> : null}
      {query.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load the map errands.</p>
          {isApiError(query.error) && query.error.requestId ? <p className="mt-1 text-xs">Request ID: {query.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void query.refetch()}>Try again</Button>
        </Alert>
      ) : null}
      {!query.isLoading && !query.error && points.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-dashed border-line bg-panel/60 p-8 text-center">
          <p className="font-extrabold text-ink">No errands match these filters.</p>
          <p className="mt-2 text-sm text-muted">Expand your radius or update your operating area to find nearby errands.</p>
        </div>
      ) : null}
      {mapError ? <Alert variant="warn" role="status">The map could not load. You can still browse the errands in <Link className="underline" href={`/marketplace${feedParams.size ? `?${feedParams}` : ''}`}>list view</Link>.</Alert> : null}
      {!mapError && libraries ? (
        <div ref={mapElement} className="h-[55vh] min-h-72 rounded-[var(--r-lg)] border border-line" role="region" aria-label="Map of approximate errand locations" />
      ) : null}
      {selected ? (
        <section className="grid gap-2 rounded-[var(--r-lg)] border border-line bg-surface p-4" aria-label="Errands in selected approximate area">
          {selected.map((point) => (
            <article key={point.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
              <div>
                <h2 className="font-extrabold text-ink">{point.title}</h2>
                <p className="text-sm text-muted">{point.area} · {point.categoryKey} · {point.distance?.label ?? 'Distance unavailable'} · {money(point.suggestedBudgetMinor)}</p>
              </div>
              <Button asChild size="sm"><Link href={`/marketplace/${point.id}`}>View errand</Link></Button>
            </article>
          ))}
          <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setSelected(null)}>Close</Button>
        </section>
      ) : null}
    </main>
  );
}
