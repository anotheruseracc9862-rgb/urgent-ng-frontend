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
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const position: Coordinates = { lat: result.coords.latitude, lng: result.coords.longitude };
        setState({ status: 'available', position, capturedAt: result.timestamp || Date.now() });
      },
      (error) => setState({ status: geolocationErrorStatus(error) }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }, []);

  return { state, request };
}
