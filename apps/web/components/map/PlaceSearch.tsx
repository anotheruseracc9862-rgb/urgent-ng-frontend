'use client';

import { useEffect, useRef } from 'react';
import { useMapProvider } from './MapProvider';
import type { Coordinates } from '@/lib/geolocation';

export interface PlaceSelection extends Coordinates {
  label: string;
}

export function PlaceSearch({ onSelect, onError, text }: {
  onSelect: (place: PlaceSelection) => void;
  onError: (error: Error) => void;
  /** Text to show in the search box, for example the address of a pin the person placed on the map. */
  text?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const element = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const textRef = useRef(text);
  const { libraries } = useMapProvider();

  useEffect(() => {
    if (!libraries || !holder.current) return;
    const search = new libraries.places.PlaceAutocompleteElement({ includedRegionCodes: ['ng'] });
    search.setAttribute('aria-label', 'Search for an address in Nigeria');
    search.setAttribute('placeholder', 'Search an area or address');
    search.style.colorScheme = 'light';
    search.style.borderRadius = 'inherit';
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
    element.current = search;
    if (textRef.current) search.value = textRef.current;
    return () => {
      search.removeEventListener('gmp-select', onPlaceSelect);
      search.remove();
      element.current = null;
    };
  }, [libraries, onError, onSelect]);

  useEffect(() => {
    textRef.current = text;
    if (element.current && text !== undefined && element.current.value !== text) element.current.value = text;
  }, [text]);

  return <div ref={holder} className="min-h-11 rounded-[var(--r-sm)] border border-line bg-surface focus-within:ring-2 focus-within:ring-green-700" />;
}
