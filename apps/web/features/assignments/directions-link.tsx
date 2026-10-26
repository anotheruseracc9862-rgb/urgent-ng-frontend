import { Navigation } from 'lucide-react';
import { Button } from '@urgent/ui';
import { flowOf, type CategoryFlow } from '@/features/reference/flow';

type Place = Record<string, unknown> | null | undefined;
export interface DirectionsErrand {
  status: string;
  accessLevel?: string;
  category?: { flow?: CategoryFlow | null } | null;
  pickup?: Place;
  destination?: Place;
}

const point = (place: Place): { lat: number; lng: number } | null => {
  const exact = place?.exact as { lat?: unknown; lng?: unknown } | undefined;
  return typeof exact?.lat === 'number' && typeof exact?.lng === 'number' ? { lat: exact.lat, lng: exact.lng } : null;
};

/**
 * Where the runner needs to go next, by stage: the pickup until it is picked up, then the drop-off. A service has one
 * address, so that is always the place. Only an exact point counts, and the server sends one only to the runner
 * of an accepted assignment, so nothing here can reveal an address early.
 */
export function directionsTarget(errand: DirectionsErrand): { lat: number; lng: number; label: string } | null {
  if (errand.accessLevel !== 'EXACT' || !['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP'].includes(errand.status)) return null;
  if (flowOf(errand.category) === 'SERVICE') {
    const address = point(errand.destination) ?? point(errand.pickup);
    return address ? { ...address, label: 'Directions to the address' } : null;
  }
  const beforePickup = errand.status !== 'PICKED_UP';
  const target = beforePickup ? point(errand.pickup) ?? point(errand.destination) : point(errand.destination);
  if (!target) return null;
  return { ...target, label: beforePickup && point(errand.pickup) ? 'Directions to pickup' : 'Directions to drop-off' };
}

export const directionsUrl = (target: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`;

/** Opens Google Maps with the next stop as the destination, from wherever the runner is now. Nothing renders when there is no exact stop. */
export function DirectionsLink({ errand }: { errand: DirectionsErrand }) {
  const target = directionsTarget(errand);
  if (!target) return null;
  return (
    <Button asChild variant="ghost">
      <a href={directionsUrl(target)} target="_blank" rel="noopener noreferrer">
        <Navigation aria-hidden="true" className="mr-2 size-4" />{target.label}
      </a>
    </Button>
  );
}
