'use client';

import { useQuery } from '@tanstack/react-query';
import { offersApi } from '@/features/offers/api';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { buildJourney } from './journey';
import { JourneyPanel } from './journey-panel';

/**
 * The journey bar above /offers/[id]. Once the offer is selected, the assignment takes over and
 * the bar follows it, so the same offer page keeps telling the truth about the whole errand.
 */
export function OfferJourney({ offerId }: { offerId: string }) {
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

  if (!offerData) return null;
  const role = session.me.id === offerData.runnerId ? 'RUNNER' : 'REQUESTER';
  const assignmentData = assignment.data?.data;
  const view = buildJourney({
    role,
    errandStatus: assignmentData?.errand.status,
    offer: { status: offerData.status, awaitingParty: offerData.awaitingParty, needsReconfirmation: offerData.needsReconfirmation },
    assignment: assignmentData ? { status: assignmentData.status, acceptanceDeadline: assignmentData.acceptanceDeadline } : null,
    ids: { errandId: offerData.errandId, offerId: offerData.id, assignmentId: assignmentId ?? undefined },
  });
  return <JourneyPanel view={view} otherRole={role === 'RUNNER' ? 'requester' : 'runner'} />;
}
