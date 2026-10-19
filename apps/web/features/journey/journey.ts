/**
 * Where an errand stands for one person, from the statuses the API already gives us.
 *
 * Seven stages. Requester and runner walk the same stages with different labels:
 *
 *   0 Offers  ->  1 Negotiate  ->  2 Select / accept  ->  3 Payment terms
 *             ->  4 Errand runs  ->  5 Confirm delivery  ->  6 Rate
 *
 * Pure functions only: the data fetching lives in `assignment-journey.tsx`, `offer-journey.tsx`
 * and `errand-journey.tsx`.
 */

export type JourneyRole = 'REQUESTER' | 'RUNNER';
export type StepState = 'done' | 'current' | 'upcoming' | 'stopped';

export interface JourneyFacts {
  role: JourneyRole;
  /** ErrandStatus of the errand, when known. */
  errandStatus?: string;
  offer?: { status: string } | null;
  assignment?: { status: string } | null;
  payment?: { fullyConfirmed: boolean } | null;
}

export interface JourneyStep {
  key: string;
  label: string;
  state: StepState;
}

export interface JourneyView {
  stage: number;
  steps: JourneyStep[];
}

const LABELS: Record<JourneyRole, string[]> = {
  REQUESTER: ['Offers', 'Negotiate', 'Select runner', 'Payment terms', 'Errand runs', 'Confirm', 'Rate'],
  RUNNER: ['Offer sent', 'Negotiate', 'Accept job', 'Payment terms', 'Run errand', 'Delivered', 'Rate'],
};
const KEYS = ['offers', 'negotiate', 'select', 'payment', 'run', 'confirm', 'rate'];

/** The stage a person is at, and whether the journey stopped or paused there. */
function position(facts: JourneyFacts): { stage: number; stopped: boolean } {
  const { assignment, offer, errandStatus } = facts;

  if (assignment) {
    switch (assignment.status) {
      case 'PENDING_ACCEPTANCE':
        return { stage: 2, stopped: false };
      case 'DECLINED':
      case 'TIMED_OUT':
        return { stage: 2, stopped: true };
      case 'CANCELLED':
        return { stage: facts.payment?.fullyConfirmed ? 4 : 3, stopped: true };
      case 'COMPLETED':
        return { stage: 6, stopped: false };
      default:
        if (errandStatus === 'DISPUTED') return { stage: 5, stopped: true };
        if (errandStatus === 'DELIVERED') return { stage: 5, stopped: false };
        if (errandStatus === 'IN_PROGRESS' || errandStatus === 'PICKED_UP') return { stage: 4, stopped: false };
        return { stage: facts.payment?.fullyConfirmed ? 4 : 3, stopped: false };
    }
  }

  if (offer) {
    if (offer.status === 'ACTIVE') return { stage: 1, stopped: false };
    if (offer.status === 'SELECTED') return { stage: 2, stopped: false };
    return { stage: 1, stopped: true };
  }

  return { stage: 0, stopped: errandStatus === 'CANCELLED' || errandStatus === 'EXPIRED' };
}

export function buildJourney(facts: JourneyFacts): JourneyView {
  const { stage, stopped } = position(facts);
  const steps = LABELS[facts.role].map((label, index): JourneyStep => {
    const key = KEYS[index];
    if (index < stage) return { key, label, state: 'done' };
    if (index === stage) return { key, label, state: stopped ? 'stopped' : 'current' };
    return { key, label, state: 'upcoming' };
  });
  return { stage, steps };
}
