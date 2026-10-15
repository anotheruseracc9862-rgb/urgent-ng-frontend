'use client';

import { useLocationSharingConsent } from '@/features/settings/consent-state';
import type { Coordinates } from '@/lib/geolocation';
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
      <div className="grid gap-5">
        <PinPicker
          label="Operating-area centre"
          value={center}
          onChange={onCenterChange}
          deviceLocationEnabled={consent.isEnabled}
          consentLoading={consent.isLoading}
        />
        {coordinates
          ? <RadiusCircle center={coordinates} radiusKm={radiusKm} onRadiusChange={onRadiusChange} onInvalidRadius={onInvalidRadius} />
          : <p className="rounded-lg bg-panel p-3 text-sm text-muted">Choose a centre on the map or search for an area before setting your radius.</p>}
      </div>
    </MapProvider>
  );
}
