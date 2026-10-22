'use client';

import type { components } from '@urgent/api-client';
import { buildJourney } from './journey';
import { JourneyPanel } from './journey-panel';

type Errand = components['schemas']['ErrandDto'];

/**
 * The journey bar for the requester's own errand page. A draft has no journey yet, so it shows
 * nothing.
 */
export function ErrandJourney({ errand }: { errand: Pick<Errand, 'id' | 'status' | 'assignment'> }) {
  const assignment = errand.assignment ?? null;
  if (errand.status === 'DRAFT') return null;
  const view = buildJourney({
    role: 'REQUESTER',
    errandStatus: errand.status,
    assignment: assignment ? { status: assignment.status } : null,
  });
  return <JourneyPanel view={view} />;
}
