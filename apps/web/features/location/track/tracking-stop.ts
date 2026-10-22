type Place = Record<string, unknown> | null | undefined;
type Coordinates = { lat: number; lng: number };

export interface TrackedErrand {
  status: string;
  pickup?: Place;
  destination?: Place;
}

const coordinates = (place: Place): Coordinates | null => {
  for (const key of ['exact', 'approx']) {
    const value = place?.[key] as { lat?: unknown; lng?: unknown } | undefined;
    if (typeof value?.lat === 'number' && typeof value?.lng === 'number') return { lat: value.lat, lng: value.lng };
  }
  return null;
};

/**
 * The place the runner is heading to: the pickup until the item is picked up, then the drop-off. An errand with no
 * pickup (shopping) heads to the drop-off. The requester owns both places, so their own point is used; the runner's
 * position on the map stays rounded.
 */
export function trackingStop(errand: TrackedErrand): { point: Coordinates; label: string; kind: 'pickup' | 'destination' } | null {
  const pickup = coordinates(errand.pickup);
  const destination = coordinates(errand.destination);
  const afterPickup = errand.status === 'PICKED_UP' || errand.status === 'DELIVERED';
  if (!afterPickup && pickup) return { point: pickup, label: 'Pickup', kind: 'pickup' };
  if (destination) return { point: destination, label: 'Drop-off', kind: 'destination' };
  if (pickup) return { point: pickup, label: 'Pickup', kind: 'pickup' };
  return null;
}
