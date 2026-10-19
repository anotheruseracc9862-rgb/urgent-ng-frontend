'use client';

import { useQuery } from '@tanstack/react-query';
import { useLivePolling } from '@/features/realtime/use-live-polling';
import { offersApi } from '@/features/offers/api';
import { queryKeys } from '@/lib/query/keys';
import { buildJourney } from './journey';
import { JourneyPanel } from './journey-panel';

/**
 * The journey bar above every screen under /assignments/[id]. It reads the same queries as the
 * pages below it, so React Query serves them from one cache and nothing is fetched twice. While
 * loading or on an error it renders nothing: the page below shows its own state.
 */
export function AssignmentJourney({ assignmentId }: { assignmentId: string }) {
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

  if (!data) return null;
  const view = buildJourney({
    role: data.role,
    errandStatus: data.errand.status,
    assignment: { status: data.status, acceptanceDeadline: data.acceptanceDeadline },
    payment: payment.data
      ? { confirmedByRequester: Boolean(payment.data.confirmedByRequesterAt), confirmedByRunner: Boolean(payment.data.confirmedByRunnerAt), fullyConfirmed: payment.data.fullyConfirmed }
      : null,
    ids: { errandId: data.errandId, offerId: data.offerId, assignmentId: data.id },
  });
  return <JourneyPanel view={view} otherRole={data.role === 'RUNNER' ? 'requester' : 'runner'} />;
}
