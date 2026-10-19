'use client';

import { useQuery } from '@tanstack/react-query';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import { offersApi } from '@/features/offers/api';
import { queryKeys } from '@/lib/query/keys';
import { buildJourney } from './journey';
import { JourneyContext } from './journey-context';

/**
 * Gives every screen under /assignments/[id] its journey, for `<JourneyHere />` to draw. It reads
 * the same queries as the pages, so React Query serves them from one cache and nothing is fetched
 * twice. While loading or on an error there is no journey and the page shows its own state.
 */
export function AssignmentJourney({ assignmentId, children }: { assignmentId: string; children: React.ReactNode }) {
  const polling = useLivePolling(30_000);
  const assignment = useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId),
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
    refetchInterval: polling,
  });
  const data = assignment.data?.data;
  // Payment terms only matter between acceptance and the start of the errand.
  const payment = useQuery({
    queryKey: queryKeys.assignments.paymentAgreement(assignmentId),
    queryFn: () => offersApi.paymentAgreement(assignmentId),
    retry: false,
    enabled: data?.status === 'ACCEPTED' && data.errand.status === 'ACCEPTED',
  });

  if (!data) return <>{children}</>;
  const view = buildJourney({
    role: data.role,
    errandStatus: data.errand.status,
    assignment: { status: data.status },
    payment: payment.data ? { fullyConfirmed: payment.data.fullyConfirmed } : null,
  });
  return <JourneyContext.Provider value={{ view }}>{children}</JourneyContext.Provider>;
}
