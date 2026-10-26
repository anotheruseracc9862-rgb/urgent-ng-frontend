'use client';

import { useEffect, useRef } from 'react';
import { Skeleton } from '@urgent/ui';
import type { Coordinates } from '@/lib/geolocation';
import { useMapProvider } from './MapProvider';

export function ApproxAreaMap({ center, radiusMeters = 500, label = 'Approximate errand area' }: {
  center: Coordinates;
  radiusMeters?: number;
  label?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const { libraries, error } = useMapProvider();

  useEffect(() => {
    if (!libraries || !element.current) return;
    const map = new libraries.maps.Map(element.current, {
      center,
      zoom: 14,
      clickableIcons: false,
      disableDefaultUI: true,
      gestureHandling: 'cooperative',
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });
    new libraries.maps.Circle({
      map,
      center,
      radius: radiusMeters,
      fillColor: '#a6d445',
      fillOpacity: 0.2,
      strokeColor: '#527b20',
      strokeOpacity: 0.7,
      strokeWeight: 1,
      clickable: false,
    });
  }, [center, libraries, radiusMeters]);

  if (error) return <p className="rounded-[var(--r)] border border-line bg-panel p-3 text-sm text-muted">{label} map is unavailable.</p>;
  if (!libraries) return <Skeleton className="h-48 rounded-[var(--r)]" aria-label="Loading approximate area" />;
  return <div ref={element} className="h-48 overflow-hidden rounded-[var(--r)] border border-line" role="img" aria-label={label} />;
}
