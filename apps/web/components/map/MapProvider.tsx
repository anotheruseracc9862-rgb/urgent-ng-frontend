'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadGoogleMaps, type GoogleMapsLibraries } from '@/lib/google-maps';

interface MapContextValue {
  libraries: GoogleMapsLibraries | null;
  error: Error | null;
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const [libraries, setLibraries] = useState<GoogleMapsLibraries | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    void loadGoogleMaps().then(
      (loaded) => { if (active) setLibraries(loaded); },
      (cause: unknown) => { if (active) setError(cause instanceof Error ? cause : new Error('Google Maps failed to load.')); },
    );
    return () => { active = false; };
  }, []);

  return <MapContext.Provider value={{ libraries, error }}>{children}</MapContext.Provider>;
}

export function useMapProvider(): MapContextValue {
  const value = useContext(MapContext);
  if (!value) throw new Error('Map components must be rendered inside MapProvider.');
  return value;
}
