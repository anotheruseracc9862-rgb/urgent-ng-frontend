'use client';

import { useEffect, useRef } from 'react';
import { Skeleton } from '@urgent/ui';
import type { LiveLocation } from '@/features/offers/api';
import { useMapProvider } from '@/components/map/MapProvider';

export function RoundedLiveLocationMap({ point }: { point: NonNullable<LiveLocation['point']> }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const { libraries, error } = useMapProvider();

  useEffect(() => {
    if (!libraries || !element.current) return;
    const center = { lat: point.lat, lng: point.lng };
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
        map: map.current,
        position: center,
        title: 'Approximate runner location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#a6d445',
          fillOpacity: 1,
          strokeColor: '#173b22',
          strokeWeight: 2,
        },
      });
      return;
    }
    map.current.setCenter(center);
    marker.current?.setPosition(center);
  }, [libraries, point.lat, point.lng]);

  if (error) return <p className="rounded-xl border border-line bg-panel p-3 text-sm text-muted">The tracking map is unavailable right now.</p>;
  if (!libraries) return <Skeleton className="h-64 rounded-xl" aria-label="Loading tracking map" />;
  return <div ref={element} className="h-64 overflow-hidden rounded-xl border border-line" role="img" aria-label="Approximate runner location map" />;
}
