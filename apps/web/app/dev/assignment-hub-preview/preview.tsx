'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/lib/auth/client';
import type { Me } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';
import { AssignmentJourney } from '@/features/journey/assignment-journey';
import { AssignmentHubPage } from '@/features/assignments/hub/assignment-hub-page';
import { RunnerExecutionPage } from '@/features/execution/runner-execution-page';
import { AssignmentRatingPage } from '@/features/ratings/assignment-rating-page';
import { ratingKeys } from '@/features/ratings/api';

const me = { id: 'run-1', name: 'Tunde Okon', firstName: 'Tunde', lastName: 'Okon', phone: null, phoneVerified: true, status: 'ACTIVE', startMode: 'RUNNER' } as unknown as Me;

const assignment = (status: string, errandStatus: string) => ({
  id: 'a1', errandId: 'e1', offerId: 'o1', requesterId: 'req-1', runnerId: 'run-1', status, role: 'RUNNER',
  agreedAmountMinor: 520000, currency: 'NGN', selectedAt: new Date().toISOString(), acceptanceDeadline: new Date(Date.now() + 20 * 60_000).toISOString(),
  version: 1, disputeId: null,
  errand: {
    id: 'e1', status: errandStatus, title: 'Pick up a birthday cake', description: 'Collect a two-tier cake from the bakery and bring it upright.', instructions: 'Keep it level. Ring the bell twice.',
    pickup: { area: 'Ikeja', lga: 'Ikeja', state: 'Lagos' }, destination: { area: 'Magodo Phase 2', lga: 'Kosofe', state: 'Lagos' },
    pickupContact: null, dropoffContact: null, photos: [], accessLevel: 'APPROXIMATE',
  },
});

/** The real hub page over sample data, for checking spacing. The sample never reaches the API. */
export function HubPreview({ status, errandStatus, screen = 'hub' }: { status: string; errandStatus: string; screen?: 'hub' | 'run' | 'rating' }) {
  const [client] = useState(() => {
    const created = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false, refetchOnWindowFocus: false, refetchInterval: false } } });
    created.setQueryData(queryKeys.assignments.detail('a1'), { data: assignment(status, errandStatus), dateHeader: new Date().toUTCString() });
    created.setQueryData(queryKeys.assignments.timeline('a1'), [
      { id: 't1', type: 'ACCEPTED', actorType: 'USER', actorId: 'run-1', note: null, mediaId: null, metadata: null, createdAt: new Date(Date.now() - 3_600_000).toISOString() },
      { id: 't2', type: 'STARTED', actorType: 'USER', actorId: 'run-1', note: 'Heading to the bakery', mediaId: null, metadata: null, createdAt: new Date(Date.now() - 1_800_000).toISOString() },
    ]);
    // The run page also shows the location-sharing card, which asks for consent and the last position.
    created.setQueryData(queryKeys.consents.history('run-1'), { consents: [] });
    created.setQueryData(queryKeys.assignments.liveLocation('a1'), null);
    created.setQueryData(ratingKeys.assignment('run-1', 'a1'), { canRate: true, reason: null, windowEndsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(), mine: null, theirs: null, counterpartRated: true });
    return created;
  });
  return (
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>
        <AssignmentJourney assignmentId="a1">
          {screen === 'run' ? <RunnerExecutionPage assignmentId="a1" /> : screen === 'rating' ? <AssignmentRatingPage assignmentId="a1" /> : <AssignmentHubPage assignmentId="a1" />}
        </AssignmentJourney>
      </SessionProvider>
    </QueryClientProvider>
  );
}
