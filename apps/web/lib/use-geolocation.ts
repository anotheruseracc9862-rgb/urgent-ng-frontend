'use client';

import { useCallback, useEffect, useState } from 'react';
import { classifyGeolocation, geolocationErrorStatus, type Coordinates, type GeolocationState } from './geolocation';

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: 'none' });

  useEffect(() => {
    if (state.status !== 'available') return;
    const delay = Math.max(0, state.capturedAt + 2 * 60 * 1000 - Date.now() + 1);
    const timer = window.setTimeout(() => {
      setState((current) => current.status === 'available'
        ? { ...current, status: classifyGeolocation(current.capturedAt) }
        : current);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [state]);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: 'unavailable' });
      return;
    }
    setState({ status: 'locating' });
    const onPosition = (result: GeolocationPosition) => {
      const position: Coordinates = { lat: result.coords.latitude, lng: result.coords.longitude };
      setState({
        status: 'available',
        position,
        capturedAt: result.timestamp || Date.now(),
        ...(Number.isFinite(result.coords.accuracy) ? { accuracyMeters: result.coords.accuracy } : {}),
      });
    };
    // First a precise fix. A phone set to share only an approximate location, or one with a weak GPS
    // signal indoors, often fails or times out at that. Ask again for a coarse fix before giving up.
    // Only a denial stops at once: asking again would not change the answer.
    navigator.geolocation.getCurrentPosition(
      onPosition,
      (error) => {
        if (error.code === 1) {
          setState({ status: 'denied' });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          onPosition,
          (second) => setState({ status: geolocationErrorStatus(second) }),
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
        );
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 },
    );
  }, []);

  return { state, request };
}
