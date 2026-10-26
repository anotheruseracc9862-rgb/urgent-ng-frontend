'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Skeleton } from '@urgent/ui';
import { MapProvider, useMapProvider } from './MapProvider';
import { loadRoutes } from '@/lib/google-maps';

type Point = { lat: number; lng: number };
type Route = { path: Point[]; meters: number; seconds: number };

/** True from `minWidth` px up (desktop by default): the map is not rendered, and so not loaded, on a phone or tablet. */
export function useWideScreen(minWidth = 1024): boolean {
  const list = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(`(min-width: ${minWidth}px)`) : null);
  const subscribe = (notify: () => void) => {
    const media = list();
    media?.addEventListener('change', notify);
    return () => media?.removeEventListener('change', notify);
  };
  return useSyncExternalStore(subscribe, () => list()?.matches ?? false, () => false);
}

const round = (value: number) => value.toFixed(4);
const routeKey = (from: Point, to: Point) => `${round(from.lat)},${round(from.lng)}:${round(to.lat)},${round(to.lng)}`;
const memory = new Map<string, Route>();

/**
 * The road route between two approximate points. One request per pair, then it is kept in memory for the page's life,
 * so a second card or a re-render does not pay for it again. It is not written to browser storage: it holds places.
 * Null when the directions service has no answer.
 */
async function roadRoute(from: Point, to: Point): Promise<Route | null> {
  const key = routeKey(from, to);
  const cached = memory.get(key);
  if (cached) return cached;
  const { DirectionsService } = await loadRoutes();
  const result = await new DirectionsService().route({ origin: from, destination: to, travelMode: google.maps.TravelMode.DRIVING });
  const leg = result.routes[0]?.legs[0];
  if (!result.routes[0] || !leg) return null;
  const route: Route = {
    path: result.routes[0].overview_path.map((point) => ({ lat: point.lat(), lng: point.lng() })),
    meters: leg.distance?.value ?? 0,
    seconds: leg.duration?.value ?? 0,
  };
  memory.set(key, route);
  return route;
}

const kilometres = (meters: number) => `${meters >= 10_000 ? Math.round(meters / 1000) : (meters / 1000).toFixed(1)} km`;
const minutes = (seconds: number) => {
  const total = Math.max(1, Math.round(seconds / 60));
  return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${total % 60} min`;
};

function RouteMap({ pickup, destination, label, showRoute }: { pickup: Point | null; destination: Point | null; label: string; showRoute: boolean }) {
  const element = useRef<HTMLDivElement>(null);
  const { libraries, error } = useMapProvider();
  const [route, setRoute] = useState<Route | null>(null);
  const [routeLoaded, setRouteLoaded] = useState(false);

  useEffect(() => {
    if (!libraries || !pickup || !destination || !showRoute) return;
    let active = true;
    roadRoute(pickup, destination).then(
      (found) => { if (active) { setRoute(found); setRouteLoaded(true); } },
      () => { if (active) setRouteLoaded(true); },
    );
    return () => { active = false; };
  }, [libraries, pickup, destination, showRoute]);

  useEffect(() => {
    if (!libraries || !element.current) return;
    const map = new libraries.maps.Map(element.current, {
      center: pickup ?? destination ?? { lat: 6.5244, lng: 3.3792 },
      zoom: 14,
      clickableIcons: false,
      disableDefaultUI: true,
      gestureHandling: 'cooperative',
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });
    const dot = (point: Point, title: string, fill: string, stroke: string) => new libraries.marker.Marker({
      map,
      position: point,
      title,
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: fill, fillOpacity: 1, strokeColor: stroke, strokeWeight: 2 },
    });
    if (pickup) dot(pickup, 'Pickup (approximate)', '#a6d445', '#173b22');
    if (destination) dot(destination, pickup ? 'Drop-off (approximate)' : 'Service address (approximate)', '#10151f', '#a6d445');
    if (pickup && destination) {
      const bounds = new google.maps.LatLngBounds();
      // Only a real road route is drawn. A straight line between two points is not a route.
      for (const point of route?.path ?? [pickup, destination]) bounds.extend(point);
      if (route) new libraries.maps.Polyline({ map, path: route.path, strokeColor: '#527b20', strokeOpacity: 0.85, strokeWeight: 4, clickable: false });
      map.fitBounds(bounds, 40);
    }
  }, [libraries, pickup, destination, route]);

  if (error) return <p className="grid h-full min-h-[240px] place-items-center rounded-[var(--r)] bg-panel p-3 text-center text-sm text-muted">The map is unavailable right now.</p>;
  if (!libraries) return <Skeleton className="h-full min-h-[240px] rounded-[var(--r)]" aria-label="Loading map" />;
  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] gap-2">
      <div ref={element} className="min-h-[240px] overflow-hidden rounded-[var(--r)] border border-line" role="img" aria-label={label} />
      {route ? (
        <p className="text-xs font-bold text-ink-2">About {kilometres(route.meters)} · {minutes(route.seconds)} by road <span className="font-normal text-muted">· approximate</span></p>
      ) : showRoute && pickup && destination && !routeLoaded ? <p className="text-xs text-muted">Finding the route…</p> : null}
    </div>
  );
}

/**
 * Where an errand is, on a map, beside it on a desktop screen (or on every screen with `allScreens`, for a page
 * that shows one map and has room for it). It shows the approximate points
 * only (the exact address stays on the task page), with the road route and its distance and time between
 * them. A list of cards shows it on desktop only: on a phone a map under every card would push the buttons
 * off the screen, and every map costs a map load.
 */
export function ApproxRouteMap({ pickup: pickupPoint, destination: destinationPoint, allScreens = false, minWidth = 1024, showRoute = true }: {
  pickup: Point | null;
  destination: Point | null;
  allScreens?: boolean;
  /** Draw the road between the two points (one billed Directions request). Off, the map shows the pins only. */
  showRoute?: boolean;
  /** Where a card list shows the map from, in px. Match the breakpoint the surrounding panel shows from. */
  minWidth?: number;
}) {
  const wide = useWideScreen(minWidth) || allScreens;
  // The list refetches on a timer and hands back new objects for the same place. Keep one object per place, so the map is not rebuilt each time.
  const pickup = useMemo(() => pickupPoint, [pickupPoint?.lat, pickupPoint?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const destination = useMemo(() => destinationPoint, [destinationPoint?.lat, destinationPoint?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!wide || (!pickup && !destination)) return null;
  const label = pickup && destination ? 'Approximate pickup and drop-off map' : 'Approximate service address map';
  return (
    <div className="min-h-[240px]">
      <MapProvider><RouteMap pickup={pickup} destination={destination} label={label} showRoute={showRoute} /></MapProvider>
    </div>
  );
}
