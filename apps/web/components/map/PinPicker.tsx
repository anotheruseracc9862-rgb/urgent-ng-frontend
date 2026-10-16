'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Input, Skeleton } from '@urgent/ui';
import { useGeolocation } from '@/lib/use-geolocation';
import type { Coordinates, GeolocationState } from '@/lib/geolocation';
import { useMapProvider } from './MapProvider';
import { PlaceSearch, type PlaceSelection } from './PlaceSearch';

const LAGOS = { lat: 6.5244, lng: 3.3792 };

export interface PinValue extends Coordinates {
  addressText?: string;
  landmark?: string;
  source: 'MAP_PIN' | 'GEOCODED_ADDRESS' | 'BROWSER_GPS' | 'MANUAL';
}

function geolocationMessage(state: GeolocationState): string {
  if (state.status === 'denied') return 'Location access was denied. Search for an address or place the pin manually.';
  if (state.status === 'unavailable') return 'Location is unavailable. Search for an address or place the pin manually.';
  if (state.status === 'stale') return 'Your location is more than two minutes old. Update it or place the pin manually.';
  return '';
}

export function PinPicker({ label, value, onChange, deviceLocationEnabled = true, consentLoading = false }: {
  label: string;
  value: PinValue | null;
  onChange: (value: PinValue) => void;
  deviceLocationEnabled?: boolean;
  consentLoading?: boolean;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const { libraries, error } = useMapProvider();
  const geolocation = useGeolocation();
  const lastAppliedGpsTimestamp = useRef<number | null>(null);
  const [searchError, setSearchError] = useState('');
  const [latitude, setLatitude] = useState(value ? String(value.lat) : '');
  const [longitude, setLongitude] = useState(value ? String(value.lng) : '');
  const [addressText, setAddressText] = useState(value?.addressText ?? '');
  const [landmark, setLandmark] = useState(value?.landmark ?? '');
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const addressTextRef = useRef(addressText);
  const landmarkRef = useRef(landmark);
  const valueLat = value?.lat;
  const valueLng = value?.lng;

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    addressTextRef.current = addressText;
    landmarkRef.current = landmark;
  }, [addressText, landmark, onChange, value]);

  const selectPoint = useCallback((point: Coordinates, source: PinValue['source'], address?: string) => {
    const selected: PinValue = {
      ...point,
      source,
      ...(address ? { addressText: address } : addressTextRef.current ? { addressText: addressTextRef.current } : {}),
      ...(landmarkRef.current ? { landmark: landmarkRef.current } : {}),
    };
    setLatitude(String(point.lat));
    setLongitude(String(point.lng));
    if (address) setAddressText(address);
    onChangeRef.current(selected);
  }, []);
  const selectPointRef = useRef(selectPoint);
  useEffect(() => {
    selectPointRef.current = selectPoint;
  }, [selectPoint]);

  useEffect(() => {
    if (!libraries || !mapElement.current || mapRef.current) return;
    const currentValue = valueRef.current;
    const map = new libraries.maps.Map(mapElement.current, {
      center: currentValue ? { lat: currentValue.lat, lng: currentValue.lng } : LAGOS,
      zoom: currentValue ? 16 : 12,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });
    const marker = new libraries.marker.Marker({
      map,
      position: currentValue ? { lat: currentValue.lat, lng: currentValue.lng } : undefined,
      draggable: true,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#a6d445',
        fillOpacity: 1,
        strokeColor: '#173b22',
        strokeWeight: 2,
      },
    });
    const mapClickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      selectPointRef.current({ lat: event.latLng.lat(), lng: event.latLng.lng() }, 'MAP_PIN');
    });
    const markerDragListener = marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) selectPointRef.current({ lat: position.lat(), lng: position.lng() }, 'MAP_PIN');
    });
    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      mapClickListener.remove();
      markerDragListener.remove();
      marker.setMap(null);
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [libraries]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || valueLat === undefined || valueLng === undefined) return;
    const point = { lat: valueLat, lng: valueLng };
    mapRef.current.setCenter(point);
    markerRef.current.setPosition(point);
  }, [valueLat, valueLng]);

  useEffect(() => {
    if (geolocation.state.status !== 'available' || geolocation.state.capturedAt === lastAppliedGpsTimestamp.current) return;
    lastAppliedGpsTimestamp.current = geolocation.state.capturedAt;
    selectPoint(geolocation.state.position, 'BROWSER_GPS');
  }, [geolocation.state, selectPoint]);

  const handlePlaceSelect = useCallback((place: PlaceSelection) => {
    setSearchError('');
    selectPoint(place, 'GEOCODED_ADDRESS', place.label);
  }, [selectPoint]);
  const handleSearchError = useCallback((cause: Error) => setSearchError(cause.message), []);

  const updateManualPoint = () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return;
    selectPoint({ lat, lng }, 'MANUAL');
  };

  return (
    <fieldset className="grid min-w-0 gap-3">
      <legend className="text-sm font-extrabold text-ink">{label}</legend>
      {libraries ? (
        <>
          <PlaceSearch onSelect={handlePlaceSelect} onError={handleSearchError} />
          <div ref={mapElement} className="h-64 overflow-hidden rounded-[var(--r)] border border-line xl:h-72" role="application" aria-label={`${label} map`} />
        </>
      ) : error ? (
        <div className="grid gap-3 rounded-[var(--r)] border border-amber/30 bg-amber-bg p-3" role="status">
          <p className="text-sm text-amber">Map search is unavailable. Enter the address, landmark, and coordinates manually, or use your device location.</p>
        </div>
      ) : <Skeleton className="h-64 rounded-[var(--r)] xl:h-72" aria-label="Loading map" />}
      {searchError ? <p className="text-sm text-red" role="alert">{searchError}</p> : null}
      {geolocation.state.status !== 'none' ? <p className="text-xs text-muted" role="status">{geolocationMessage(geolocation.state)}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="soft" className="w-fit" disabled={!deviceLocationEnabled || consentLoading} onClick={geolocation.request}>Use my location</Button>
        {!libraries ? (
          <Button type="button" variant="ghost" className="w-fit" onClick={updateManualPoint} disabled={!latitude || !longitude}>Set manual coordinates</Button>
        ) : null}
      </div>
      {!deviceLocationEnabled && !consentLoading ? (
        <p className="max-w-3xl text-xs leading-5 text-muted">
          Device location is off. Enable optional location sharing in <Link href="/settings/privacy" className="font-bold text-ink underline underline-offset-2">Privacy settings</Link> to use it, or choose a pin on the map.
        </p>
      ) : null}
      {!libraries ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold text-ink">Area or address
            <Input value={addressText} maxLength={300} onChange={(event) => setAddressText(event.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-ink">Nearby landmark
            <Input value={landmark} maxLength={200} onChange={(event) => setLandmark(event.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-ink">Latitude
            <Input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-ink">Longitude
            <Input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
