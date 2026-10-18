'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { ArrowRight, ChevronRight, Expand, LockKeyhole, MapPin, Minus, Package, Plus, X } from 'lucide-react';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { marketplaceApi, type MapPoint, type MarketplaceFilters } from '../api';
import { MarketplaceControls } from '../marketplace-controls';
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

function clusterPoints(points: MapPoint[], projection: google.maps.Projection, zoom: number) {
  const groups: { anchor: google.maps.Point; points: MapPoint[] }[] = [];
  for (const point of points) {
    const anchor = projection.fromLatLngToPoint(new google.maps.LatLng(point.approx));
    if (!anchor) continue;
    // Group by screen distance, not fixed geographic cells, so zooming reveals individual pins.
    const group = groups.find((group) => Math.hypot(anchor.x - group.anchor.x, anchor.y - group.anchor.y) * 2 ** zoom < 56);
    if (group) group.points.push(point);
    else groups.push({ anchor, points: [point] });
  }
  return groups.map((group) => group.points);
}

function fitErrands(map: google.maps.Map, points: MapPoint[]) {
  if (!points.length) return;
  const bounds = new google.maps.LatLngBounds();
  points.forEach((point) => bounds.extend(point.approx));
  map.fitBounds(bounds, 64);
  // Only limit auto-framing. A runner's subsequent zoom must never be snapped back.
  return google.maps.event.addListenerOnce(map, 'idle', () => {
    if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
  });
}

function money(minor: number | null) {
  return minor === null
    ? 'No budget'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
}

export function MarketplaceMapPage() {
  const searchParams = useSearchParams();
  const { libraries, error: mapError } = useMapProvider();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const filters = useMemo(() => filtersFromSearch(new URLSearchParams(searchParams.toString())), [searchParams]);
  const query = useQuery({
    queryKey: queryKeys.marketplace.map({ ...filters }),
    queryFn: () => marketplaceApi.map(filters),
    retry: false,
  });
  const points = useMemo(() => query.data?.data ?? [], [query.data]);
  const selected = points.filter((point) => selectedIds.includes(point.id));

  useEffect(() => {
    if (!libraries || !mapElement.current) return;
    const palette = getComputedStyle(document.documentElement);
    const map = new libraries.maps.Map(mapElement.current, {
      center: { lat: 6.5244, lng: 3.3792 },
      zoom: 12,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      cameraControl: false,
      minZoom: 5,
      maxZoom: 20,
      gestureHandling: 'greedy',
      styles: [
        { featureType: 'landscape', stylers: [{ color: palette.getPropertyValue('--panel').trim() }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: palette.getPropertyValue('--surface').trim() }] },
        { featureType: 'water', stylers: [{ color: '#dce9e5' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: palette.getPropertyValue('--muted').trim() }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
    mapInstance.current = map;
    return () => { mapInstance.current = null; };
  }, [libraries]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!libraries || !map) return;
    const palette = getComputedStyle(document.documentElement);
    let markers: { marker: google.maps.Marker; listener: google.maps.MapsEventListener }[] = [];
    function clearMarkers() {
      markers.forEach(({ marker, listener }) => {
        listener.remove();
        marker.setMap(null);
      });
    }
    const renderMarkers = () => {
      const projection = map.getProjection();
      if (!projection) return;
      clearMarkers();
      markers = clusterPoints(points, projection, map.getZoom() ?? 12).map((group) => {
        const position = {
          lat: group.reduce((sum, point) => sum + point.approx.lat, 0) / group.length,
          lng: group.reduce((sum, point) => sum + point.approx.lng, 0) / group.length,
        };
        const clustered = group.length > 1;
        const marker = new libraries.marker.Marker({
          map,
          position,
          title: clustered ? `Zoom into ${group.length} errands in this approximate area` : `Preview ${group[0].title}`,
          label: { text: String(group.length), color: palette.getPropertyValue('--ink').trim(), fontSize: '13px', fontWeight: '800' },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: clustered ? 22 : 16,
            fillColor: palette.getPropertyValue(clustered ? '--lime' : '--surface').trim(),
            fillOpacity: 1,
            strokeColor: palette.getPropertyValue('--green-900').trim(),
            strokeWeight: 2,
          },
          optimized: false,
          zIndex: group.length,
        });
        const listener = marker.addListener('click', () => {
          setSelectedIds(group.map((point) => point.id));
          if (clustered) {
            map.panTo(position);
            map.setZoom(Math.min(20, (map.getZoom() ?? 12) + 2));
          }
        });
        return { marker, listener };
      });
    };
    const listener = map.addListener('idle', renderMarkers);
    const framingListener = fitErrands(map, points);
    renderMarkers();
    return () => {
      listener.remove();
      framingListener?.remove();
      clearMarkers();
    };
  }, [libraries, points]);

  const feedParams = new URLSearchParams(searchParams.toString());
  feedParams.delete('view');

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <MarketplaceControls count={points.length} pending={query.isPending} updating={query.isFetching} />

      {query.isPending ? <Skeleton className="h-[55vh] min-h-72 rounded-[var(--r-lg)]" aria-label="Loading map errands" /> : null}
      {query.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load the map errands.</p>
          {isApiError(query.error) && query.error.requestId ? <p className="mt-1 text-xs">Request ID: {query.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void query.refetch()}>Try again</Button>
        </Alert>
      ) : null}
      {!query.isPending && !query.error && points.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-dashed border-line bg-panel/60 p-8 text-center">
          <p className="font-extrabold text-ink">No errands match these filters.</p>
          <p className="mt-2 text-sm text-muted">Expand your radius or update your operating area to find nearby errands.</p>
        </div>
      ) : null}
      {mapError ? <Alert variant="warn" role="status">The map could not load. You can still browse the errands in <Link className="underline" href={`/marketplace${feedParams.size ? `?${feedParams}` : ''}`}>list view</Link>.</Alert> : null}
      {!mapError && libraries ? (
        <section className="overflow-hidden rounded-[var(--r-lg)] bg-surface shadow-[var(--shadow)]">
          <div className="relative">
            <div ref={mapElement} className="h-[55vh] min-h-80" role="region" aria-label="Map of approximate errand locations" />
            <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-3" role="group" aria-label="Map controls">
              <Button type="button" variant="ghost" size="sm" className="border border-line bg-surface shadow-[var(--shadow)]" disabled={!points.length} onClick={() => { if (mapInstance.current) fitErrands(mapInstance.current, points); setSelectedIds([]); }}><Expand aria-hidden="true" className="size-4" />Show all errands</Button>
              <div className="grid overflow-hidden rounded-full border border-line bg-surface shadow-[var(--shadow)]">
                <button type="button" aria-label="Zoom in" onClick={() => { const map = mapInstance.current; if (map) map.setZoom(Math.min(20, (map.getZoom() ?? 12) + 1)); }} className="grid size-11 place-items-center text-ink hover:bg-tint focus-visible:bg-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green-700"><Plus aria-hidden="true" className="size-[18px]" /></button>
                <button type="button" aria-label="Zoom out" onClick={() => { const map = mapInstance.current; if (map) map.setZoom(Math.max(5, (map.getZoom() ?? 12) - 1)); }} className="grid size-11 place-items-center border-t border-line text-ink hover:bg-tint focus-visible:bg-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green-700"><Minus aria-hidden="true" className="size-[18px]" /></button>
              </div>
            </div>
            {selected.length > 0 && (
              <section aria-label="Errands in selected approximate area" className="grid gap-4 border-t border-line bg-surface p-4 lg:absolute lg:left-4 lg:top-4 lg:z-10 lg:max-h-[calc(100%-5rem)] lg:w-80 lg:overflow-y-auto lg:rounded-[var(--r)] lg:border lg:shadow-[var(--shadow-pop)]">
                <header className="flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 text-xs font-extrabold text-green-900"><Package aria-hidden="true" className="size-4" />{selected.length === 1 ? 'Quick look' : `${selected.length} errands in this area`}</p>
                  <button type="button" aria-label="Close preview" onClick={() => setSelectedIds([])} className="grid size-9 shrink-0 place-items-center rounded-full bg-panel text-ink-2 hover:bg-tint focus-visible:outline-2 focus-visible:outline-green-700"><X aria-hidden="true" className="size-4" /></button>
                </header>
                {selected.map((point) => (
                  <article key={point.id} className="grid gap-3 border-b border-line pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-green-900"><span className="rounded-full bg-tint-2 px-2.5 py-1.5 capitalize">{point.categoryKey.replaceAll('_', ' ')}</span>{point.boosted && <span className="rounded-full bg-amber-bg px-2.5 py-1.5 text-amber">Boosted</span>}</div>
                    <h2 className="break-words text-base font-extrabold leading-snug tracking-tight text-ink">{point.title}</h2>
                    <p className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted"><MapPin aria-hidden="true" className="size-3.5" />{point.area}<span aria-hidden="true">·</span>{point.distance?.label ?? 'Distance unavailable'}</p>
                    <p className="text-xl font-extrabold tracking-tight text-ink">{money(point.suggestedBudgetMinor)}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild size="sm" className="min-w-0 gap-1 px-3 text-xs"><Link href={`/marketplace/${point.id}/offer`}>Send offer<ArrowRight aria-hidden="true" className="size-3.5" /></Link></Button>
                      <Button asChild variant="ghost" size="sm" className="min-w-0 gap-1 px-3 text-xs"><Link href={`/marketplace/${point.id}`}>View details<ChevronRight aria-hidden="true" className="size-3.5" /></Link></Button>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[11px] text-muted">
            <p className="inline-flex items-center gap-1.5"><LockKeyhole aria-hidden="true" className="size-3.5 shrink-0" />Pins show approximate areas, never exact addresses.</p>
            <p><span className="hidden sm:inline">Scroll to zoom · Drag to explore</span><span className="sm:hidden">Pinch to zoom · Tap a pin to preview</span></p>
          </footer>
        </section>
      ) : null}
    </main>
  );
}
