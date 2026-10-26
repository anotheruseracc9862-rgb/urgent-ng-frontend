'use client';

import { useLocationSharingConsent } from '@/features/settings/consent-state';
import type { Coordinates } from '@/lib/geolocation';
import { MapPin } from 'lucide-react';
import { MapProvider } from '@/components/map/MapProvider';
import { PinPicker, type PinValue } from '@/components/map/PinPicker';
import { RadiusCircle } from '@/components/map/RadiusCircle';

export function RunnerAreaPicker({
  center,
  onCenterChange,
  radiusKm,
  onRadiusChange,
  onInvalidRadius,
}: {
  center: PinValue | null;
  onCenterChange: (value: PinValue) => void;
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
  onInvalidRadius: (value: string) => void;
}) {
  const consent = useLocationSharingConsent();
  const coordinates: Coordinates | null = center ? { lat: center.lat, lng: center.lng } : null;

  return (
    <MapProvider>
      <div className="grid min-w-0 gap-6 md:grid-cols-2 md:items-start">
        <section className="min-w-0">
          <PinPicker
            label="Operating-area centre"
            value={center}
            onChange={onCenterChange}
            deviceLocationEnabled={consent.isEnabled}
            consentLoading={consent.isLoading}
          />
        </section>
        <section className="min-w-0 border-t border-line-2 pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          {coordinates ? (
            <RadiusCircle center={coordinates} radiusKm={radiusKm} onRadiusChange={onRadiusChange} onInvalidRadius={onInvalidRadius} />
          ) : (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-ink">Operating radius</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">Choose how far from your centre you want to work (1–20 km).</p>
                </div>
                <span className="rounded-full bg-panel px-3 py-1.5 text-xs font-bold text-muted">Set a centre first</span>
              </div>
              <div className="grid min-h-64 place-items-center rounded-[var(--r-lg)] border border-dashed border-line bg-panel/50 px-6 text-center xl:min-h-72">
                <div className="grid justify-items-center gap-2">
                  <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-surface text-muted">
                    <MapPin className="size-5" />
                  </span>
                  <p className="max-w-xs text-sm leading-5 text-muted">Set your operating-area centre to preview and adjust its radius here.</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </MapProvider>
  );
}
