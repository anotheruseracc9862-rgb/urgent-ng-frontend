'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { offersApi } from '@/features/offers/api';
import { queryKeys } from '@/lib/query/keys';
import { buildJourney } from './journey';
import { JourneyPanel } from './journey-panel';

type Errand = components['schemas']['ErrandDto'];

/**
 * The journey bar for the requester's own errand page. A draft has no journey yet, so it shows
 * nothing. The payment terms are read only while they decide the stage (accepted, not started).
 */
export function ErrandJourney({ errand }: { errand: Pick<Errand, 'id' | 'status' | 'assignment'> }) {
  const assignment = errand.assignment ?? null;
  const payment = useQuery({
    queryKey: queryKeys.assignments.paymentAgreement(assignment?.id ?? ''),
    queryFn: () => offersApi.paymentAgreement(assignment!.id),
    retry: false,
    enabled: Boolean(assignment) && assignment?.status === 'ACCEPTED' && errand.status === 'ACCEPTED',
  });

  if (errand.status === 'DRAFT') return null;
  const view = buildJourney({
    role: 'REQUESTER',
    errandStatus: errand.status,
    assignment: assignment ? { status: assignment.status } : null,
    payment: payment.data
      ? { confirmedByRequester: Boolean(payment.data.confirmedByRequesterAt), confirmedByRunner: Boolean(payment.data.confirmedByRunnerAt), fullyConfirmed: payment.data.fullyConfirmed }
      : null,
    ids: { errandId: errand.id, assignmentId: assignment?.id },
  });
  return <JourneyPanel view={view} otherRole="runner" className="mb-0" />;
}
