'use client';

import { MapProvider } from './MapProvider';
import { PinPicker, type PinValue } from './PinPicker';
import { useLocationSharingConsent } from '@/features/settings/consent-state';

export function LocationPicker({ label, value, onChange }: {
  label: string;
  value: PinValue | null;
  onChange: (value: PinValue) => void;
}) {
  const consent = useLocationSharingConsent();
  return (
    <MapProvider>
      <PinPicker label={label} value={value} onChange={onChange} deviceLocationEnabled={consent.isEnabled} consentLoading={consent.isLoading} />
    </MapProvider>
  );
}
