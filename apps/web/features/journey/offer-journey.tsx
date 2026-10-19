'use client';

import { useQuery } from '@tanstack/react-query';
import { offersApi } from '@/features/offers/api';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { buildJourney } from './journey';
import { JourneyContext } from './journey-context';

/**
 * Gives /offers/[id] its journey, for `<JourneyHere />` to draw. Once the offer is selected, the assignment takes over and
 * the bar follows it, so the same offer page keeps telling the truth about the whole errand.
 */
export function OfferJourney({ offerId, children }: { offerId: string; children: React.ReactNode }) {
  const session = useSession();
  const offer = useQuery({
    queryKey: queryKeys.offers.detail(offerId),
    queryFn: () => offersApi.negotiation(offerId),
    retry: false,
  });
  const offerData = offer.data;
  const assignmentId = offerData?.status === 'SELECTED' ? offerData.assignmentId : null;
  const assignment = useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId ?? ''),
    queryFn: () => offersApi.assignment(assignmentId!),
    retry: false,
    enabled: Boolean(assignmentId),
  });

  if (!offerData) return <>{children}</>;
  const role = session.me.id === offerData.runnerId ? 'RUNNER' : 'REQUESTER';
  const assignmentData = assignment.data?.data;
  const view = buildJourney({
    role,
    errandStatus: assignmentData?.errand.status,
    offer: { status: offerData.status },
    assignment: assignmentData ? { status: assignmentData.status } : null,
  });
  return <JourneyContext.Provider value={{ view }}>{children}</JourneyContext.Provider>;
}
