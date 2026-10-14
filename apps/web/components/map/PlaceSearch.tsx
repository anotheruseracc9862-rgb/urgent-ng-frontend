'use client';

import { useEffect, useRef } from 'react';
import { useMapProvider } from './MapProvider';
import type { Coordinates } from '@/lib/geolocation';

export interface PlaceSelection extends Coordinates {
  label: string;
}

export function PlaceSearch({ onSelect, onError }: {
  onSelect: (place: PlaceSelection) => void;
  onError: (error: Error) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const { libraries } = useMapProvider();

  useEffect(() => {
    if (!libraries || !holder.current) return;
    const search = new libraries.places.PlaceAutocompleteElement({ includedRegionCodes: ['ng'] });
    search.setAttribute('aria-label', 'Search for an address in Nigeria');
    const onPlaceSelect = (event: Event) => {
      void (async () => {
        try {
          const selected = event as google.maps.places.PlacePredictionSelectEvent;
          const place = selected.placePrediction.toPlace();
          await place.fetchFields({ fields: ['location', 'formattedAddress'] });
          if (!place.location) {
            onError(new Error('The selected place did not include a map location.'));
            return;
          }
          onSelect({
            lat: place.location.lat(),
            lng: place.location.lng(),
            label: place.formattedAddress ?? '',
          });
        } catch (cause) {
          onError(cause instanceof Error ? cause : new Error('The selected place could not be loaded.'));
        }
      })();
    };
    search.addEventListener('gmp-select', onPlaceSelect);
    holder.current.replaceChildren(search);
    return () => {
      search.removeEventListener('gmp-select', onPlaceSelect);
      search.remove();
    };
  }, [libraries, onError, onSelect]);

  return <div ref={holder} className="min-h-11" />;
}
