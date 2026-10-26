export interface Coordinates {
  lat: number;
  lng: number;
}

export type GeolocationState =
  | { status: 'none' | 'locating' | 'unavailable' | 'denied' | 'timeout' }
  | { status: 'available' | 'stale'; position: Coordinates; capturedAt: number; accuracyMeters?: number };

/** Beyond this the phone gave a coarse fix (for example the "Approximate" choice on iOS and Android). */
export const COARSE_ACCURACY_METERS = 1000;

export function classifyGeolocation(capturedAt: number, now = Date.now()): 'available' | 'stale' {
  return now - capturedAt > 2 * 60 * 1000 ? 'stale' : 'available';
}

export function geolocationErrorStatus(error: Pick<GeolocationPositionError, 'code'>): 'denied' | 'unavailable' | 'timeout' {
  if (error.code === 1) return 'denied';
  return error.code === 3 ? 'timeout' : 'unavailable';
}
