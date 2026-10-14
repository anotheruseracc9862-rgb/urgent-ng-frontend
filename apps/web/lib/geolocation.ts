export interface Coordinates {
  lat: number;
  lng: number;
}

export type GeolocationState =
  | { status: 'none' | 'unavailable' | 'denied' }
  | { status: 'available' | 'stale'; position: Coordinates; capturedAt: number };

export function classifyGeolocation(capturedAt: number, now = Date.now()): 'available' | 'stale' {
  return now - capturedAt > 2 * 60 * 1000 ? 'stale' : 'available';
}

export function geolocationErrorStatus(error: Pick<GeolocationPositionError, 'code'>): 'denied' | 'unavailable' {
  return error.code === 1 ? 'denied' : 'unavailable';
}
