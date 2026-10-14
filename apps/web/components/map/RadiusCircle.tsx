'use client';

import { useEffect, useRef } from 'react';
import { Input } from '@urgent/ui';
import type { Coordinates } from '@/lib/geolocation';
import { useMapProvider } from './MapProvider';

export function RadiusCircle({ center, radiusKm, onRadiusChange }: {
  center: Coordinates;
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const { libraries } = useMapProvider();

  useEffect(() => {
    if (!libraries || !element.current) return;
    const map = new libraries.maps.Map(element.current, {
      center,
      zoom: 12,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
    });
    const circle = new libraries.maps.Circle({
      map,
      center,
      radius: radiusKm * 1000,
      editable: true,
      draggable: true,
      fillColor: '#a6d445',
      fillOpacity: 0.15,
      strokeColor: '#527b20',
      strokeWeight: 2,
    });
    const syncRadius = () => onRadiusChange(Math.min(20, Math.max(1, (circle.getRadius() ?? 1000) / 1000)));
    const radiusListener = circle.addListener('radius_changed', syncRadius);
    const dragListener = circle.addListener('dragend', syncRadius);
    return () => {
      radiusListener.remove();
      dragListener.remove();
      circle.setMap(null);
    };
  }, [center, libraries, onRadiusChange, radiusKm]);

  return (
    <label className="grid gap-2 text-sm font-bold text-ink">
      Operating radius (1–20 km)
      <Input type="number" min={1} max={20} step={1} value={radiusKm} onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next) && next >= 1 && next <= 20) onRadiusChange(next);
      }} />
      <div ref={element} className="h-64 overflow-hidden rounded-[var(--r)] border border-line" aria-label="Operating radius map" />
    </label>
  );
}
