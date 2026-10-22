'use client';

import { useEffect, useRef } from 'react';
import { Skeleton } from '@urgent/ui';
import type { LiveLocation } from '@/features/offers/api';
import { useMapProvider } from '@/components/map/MapProvider';

type Point = { lat: number; lng: number };

/**
 * The runner's rounded position, and optionally the stop they are heading to (the pickup, then the drop-off). With a
 * stop the map is fitted to both, once, so later position updates move the runner without pulling the view about.
 * With no position (sharing is off or expired) the stop is shown alone.
 */
export function RoundedLiveLocationMap({ point, stop }: {
  point: LiveLocation['point'];
  stop?: { point: Point; label: string; kind: 'pickup' | 'destination' } | null;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const stopMarker = useRef<google.maps.Marker | null>(null);
  const fitted = useRef(false);
  const { libraries, error } = useMapProvider();
  const stopLat = stop?.point.lat;
  const stopLng = stop?.point.lng;
  const stopLabel = stop?.label;
  const runnerLat = point?.lat;
  const runnerLng = point?.lng;
  const stopKind = stop?.kind;

  useEffect(() => {
    if (!libraries || !element.current) return;
    const runner = runnerLat !== undefined && runnerLng !== undefined ? { lat: runnerLat, lng: runnerLng } : null;
    const center = runner ?? { lat: stopLat ?? 6.5244, lng: stopLng ?? 3.3792 };
    if (!map.current) {
      map.current = new libraries.maps.Map(element.current, {
        center,
        zoom: 14,
        clickableIcons: false,
        disableDefaultUI: true,
        gestureHandling: 'cooperative',
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      });
      marker.current = new libraries.marker.Marker({
        map: runner ? map.current : null,
        position: center,
        title: 'Approximate runner location',
        zIndex: 2,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#a6d445',
          fillOpacity: 1,
          strokeColor: '#173b22',
          strokeWeight: 2,
        },
      });
    } else {
      marker.current?.setPosition(center);
      marker.current?.setMap(runner ? map.current : null);
    }

    if (stopLat === undefined || stopLng === undefined) {
      stopMarker.current?.setMap(null);
      stopMarker.current = null;
      fitted.current = false;
      map.current.setCenter(center);
      return;
    }
    const place = { lat: stopLat, lng: stopLng };
    if (!stopMarker.current) {
      stopMarker.current = new libraries.marker.Marker({
        map: map.current,
        position: place,
        zIndex: 1,
        label: { text: stopKind === 'destination' ? 'D' : 'P', color: '#ffffff', fontSize: '11px', fontWeight: '800' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#10151f',
          fillOpacity: 1,
          strokeColor: '#a6d445',
          strokeWeight: 2,
        },
      });
    }
    stopMarker.current.setPosition(place);
    stopMarker.current.setTitle(stopLabel ?? 'Next stop');
    if (!fitted.current) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(center);
      bounds.extend(place);
      if (runner) map.current.fitBounds(bounds, 48);
      else map.current.setCenter(place);
      fitted.current = true;
    }
  }, [libraries, runnerLat, runnerLng, stopLat, stopLng, stopLabel, stopKind]);

  if (error) return <p className="rounded-xl border border-line bg-panel p-3 text-sm text-muted">The tracking map is unavailable right now.</p>;
  if (!libraries) return <Skeleton className="h-64 rounded-xl" aria-label="Loading tracking map" />;
  return (
    <div className="grid gap-2">
      <div ref={element} className="h-64 overflow-hidden rounded-xl border border-line" role="img" aria-label={stop ? (point ? `Approximate runner location and the ${stop.label.toLowerCase()}` : `The ${stop.label.toLowerCase()} on the map`) : 'Approximate runner location map'} />
      {stop ? (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {point ? <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-lime-600" />Runner (approximate)</span> : null}
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-ink" />{stop.label}</span>
        </p>
      ) : null}
    </div>
  );
}
