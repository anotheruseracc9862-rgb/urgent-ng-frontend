export interface LocationSample {
  lat: number;
  lng: number;
}

export interface SentLocation extends LocationSample {
  sentAt: number;
}

const MIN_SEND_INTERVAL_MS = 30_000;
const MIN_MOVEMENT_METERS = 100;
const EARTH_RADIUS_METERS = 6_371_000;

export function distanceMeters(from: LocationSample, to: LocationSample): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const fromLat = radians(from.lat);
  const toLat = radians(to.lat);
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function shouldSendLocation(lastSent: SentLocation | null, current: LocationSample, now: number): boolean {
  if (!lastSent) return true;
  return now - lastSent.sentAt >= MIN_SEND_INTERVAL_MS
    && distanceMeters(lastSent, current) >= MIN_MOVEMENT_METERS;
}
