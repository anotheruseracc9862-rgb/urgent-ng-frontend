'use client';

import { useEffect, useRef } from 'react';
import { Input } from '@urgent/ui';
import type { Coordinates } from '@/lib/geolocation';
import { useMapProvider } from './MapProvider';

export function RadiusCircle({ center, radiusKm, onRadiusChange, onInvalidRadius }: {
  center: Coordinates;
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
  onInvalidRadius?: (value: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const { libraries } = useMapProvider();
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const centerRef = useRef(center);
  const radiusRef = useRef(radiusKm);
  const onRadiusChangeRef = useRef(onRadiusChange);

  useEffect(() => {
    centerRef.current = center;
    radiusRef.current = radiusKm;
    onRadiusChangeRef.current = onRadiusChange;
  }, [center, onRadiusChange, radiusKm]);

  useEffect(() => {
    if (!libraries || !element.current) return;
    const initialCenter = centerRef.current;
    const map = new libraries.maps.Map(element.current, {
      center: initialCenter,
      zoom: 12,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
    });
    const circle = new libraries.maps.Circle({
      map,
      center: initialCenter,
      radius: radiusRef.current * 1000,
      editable: true,
      draggable: true,
      fillColor: '#a6d445',
      fillOpacity: 0.15,
      strokeColor: '#527b20',
      strokeWeight: 2,
    });
    const syncRadius = () => onRadiusChangeRef.current(Math.round(Math.min(20, Math.max(1, (circle.getRadius() ?? 1000) / 1000)) * 10) / 10);
    const radiusListener = circle.addListener('radius_changed', syncRadius);
    const dragListener = circle.addListener('dragend', syncRadius);
    mapRef.current = map;
    circleRef.current = circle;
    return () => {
      radiusListener.remove();
      dragListener.remove();
      circle.setMap(null);
      mapRef.current = null;
      circleRef.current = null;
    };
  }, [libraries]);

  useEffect(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!map || !circle) return;
    const nextCenter = { lat: center.lat, lng: center.lng };
    map.setCenter(nextCenter);
    circle.setCenter(nextCenter);
    const nextRadius = radiusKm * 1000;
    if (Math.abs((circle.getRadius() ?? 0) - nextRadius) > 1) circle.setRadius(nextRadius);
    const bounds = circle.getBounds();
    if (bounds) map.fitBounds(bounds, 24);
  }, [center.lat, center.lng, libraries, radiusKm]);

  return (
    <section className="grid gap-3" aria-labelledby="operating-radius-label">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="operating-radius-label" className="text-sm font-extrabold text-ink">Operating radius</h3>
          <p className="mt-1 text-xs leading-5 text-muted">How far you’re happy to travel.</p>
        </div>
        <label className="grid gap-1 text-xs font-bold text-muted">
          Radius (km)
          <Input type="number" min={1} max={20} step={0.1} value={radiusKm} onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next) && next >= 1 && next <= 20) onRadiusChange(next);
            else onInvalidRadius?.(event.target.value);
          }} className="min-h-11 w-24 border border-line bg-white text-sm text-ink" />
        </label>
      </div>
      <div ref={element} className="h-64 overflow-hidden rounded-[var(--r-lg)] border border-line xl:h-72" aria-label="Operating radius map" />
      <label className="grid gap-2 text-xs text-muted">
        <span className="sr-only">Adjust operating radius in kilometres</span>
        <input type="range" min={1} max={20} step={0.1} value={radiusKm} onChange={(event) => onRadiusChange(Number(event.target.value))} className="h-6 w-full cursor-pointer accent-green-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700" />
        <span aria-hidden="true" className="flex justify-between font-semibold"><span>1 km · Stay local</span><span>20 km · Go further</span></span>
      </label>
    </section>
  );
}
