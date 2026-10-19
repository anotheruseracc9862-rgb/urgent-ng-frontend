/**
 * Where an errand stands for one person, from the statuses the API already gives us.
 *
 * The flow has seven stages. Requester and runner walk the same stages with different labels and
 * different things to do, so every screen can show the same bar and a "what happens next" card:
 *
 *   0 Offers  ->  1 Negotiate  ->  2 Select / accept  ->  3 Payment terms
 *             ->  4 Errand runs  ->  5 Confirm delivery  ->  6 Rate
 *
 * Pure functions only: the data fetching lives in `assignment-journey.tsx` and `offer-journey.tsx`.
 */

export type JourneyRole = 'REQUESTER' | 'RUNNER';
export type StepState = 'done' | 'current' | 'upcoming' | 'stopped';

export interface JourneyFacts {
  role: JourneyRole;
  /** ErrandStatus of the errand, when known. */
  errandStatus?: string;
  offer?: {
    status: string;
    awaitingParty: 'RUNNER' | 'REQUESTER' | 'NONE';
    needsReconfirmation: boolean;
  } | null;
  assignment?: {
    status: string;
    /** ISO time the runner must accept by. */
    acceptanceDeadline?: string | null;
  } | null;
  payment?: {
    confirmedByRequester: boolean;
    confirmedByRunner: boolean;
    fullyConfirmed: boolean;
  } | null;
  ids: { errandId?: string; offerId?: string; assignmentId?: string };
}

export interface JourneyStep {
  key: string;
  label: string;
  state: StepState;
}

export type NextTone = 'action' | 'wait' | 'done' | 'stopped';

export interface NextStep {
  tone: NextTone;
  title: string;
  /** What this person should know or do. */
  body: string;
  /** What the other person sees at the same moment. */
  other: string;
  cta?: { label: string; href: string };
}

export interface JourneyView {
  stage: number;
  steps: JourneyStep[];
  next: NextStep;
}

const LABELS: Record<JourneyRole, string[]> = {
  REQUESTER: ['Offers', 'Negotiate', 'Select runner', 'Payment terms', 'Errand runs', 'Confirm', 'Rate'],
  RUNNER: ['Offer sent', 'Negotiate', 'Accept job', 'Payment terms', 'Run errand', 'Delivered', 'Rate'],
};

type Ended = 'DECLINED' | 'TIMED_OUT' | 'CANCELLED' | 'WITHDRAWN' | 'REJECTED' | 'EXPIRED' | 'CLOSED' | 'ERRAND_CANCELLED' | 'ERRAND_EXPIRED';

interface Position {
  stage: number;
  ended?: Ended;
  paused?: boolean;
}

function position(facts: JourneyFacts): Position {
  const { assignment, offer, errandStatus } = facts;

  if (assignment) {
    switch (assignment.status) {
      case 'PENDING_ACCEPTANCE':
        return { stage: 2 };
      case 'DECLINED':
      case 'TIMED_OUT':
        return { stage: 2, ended: assignment.status };
      case 'CANCELLED':
        return { stage: facts.payment?.fullyConfirmed ? 4 : 3, ended: 'CANCELLED' };
      case 'COMPLETED':
        return { stage: 6 };
      default: {
        if (errandStatus === 'DISPUTED') return { stage: 5, paused: true };
        if (errandStatus === 'DELIVERED') return { stage: 5 };
        if (errandStatus === 'IN_PROGRESS' || errandStatus === 'PICKED_UP') return { stage: 4 };
        return { stage: facts.payment?.fullyConfirmed ? 4 : 3 };
      }
    }
  }

  if (offer) {
    if (offer.status === 'ACTIVE') return { stage: 1 };
    if (offer.status === 'SELECTED') return { stage: 2 };
    return { stage: 1, ended: offer.status as Ended };
  }

  if (errandStatus === 'CANCELLED') return { stage: 0, ended: 'ERRAND_CANCELLED' };
  if (errandStatus === 'EXPIRED') return { stage: 0, ended: 'ERRAND_EXPIRED' };
  return { stage: 0 };
}

const lagosTime = (iso: string) =>
  new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' }).format(new Date(iso));

function describeEnded(role: JourneyRole, ended: Ended): NextStep {
  const runner = role === 'RUNNER';
  const base = { tone: 'stopped' as const };
  switch (ended) {
    case 'DECLINED':
      return { ...base, title: 'Job declined', body: runner ? 'You declined this job. The errand went back to other runners.' : 'The runner declined. Your errand is open again, so you can choose another runner.', other: runner ? 'The requester was told and the errand reopened.' : 'The runner sees that they declined this job.' };
    case 'TIMED_OUT':
      return { ...base, title: 'Acceptance window ended', body: runner ? 'You did not accept in time, so the errand went back to the requester.' : 'The runner did not accept in time. Your errand is open again, so you can choose another runner.', other: runner ? 'The requester was told and the errand reopened.' : 'The runner sees that the window ended.' };
    case 'CANCELLED':
      return { ...base, title: 'Cancelled', body: 'This job was cancelled. The reason is recorded for both sides.', other: 'The other person sees the same cancellation.' };
    case 'WITHDRAWN':
      return { ...base, title: 'Offer withdrawn', body: runner ? 'You withdrew this offer.' : 'The runner withdrew their offer.', other: runner ? 'The requester sees that you withdrew.' : 'The runner sees that they withdrew it.' };
    case 'REJECTED':
      return { ...base, title: 'Offer declined', body: runner ? 'The requester declined this offer.' : 'You declined this offer.', other: runner ? 'You can offer on other errands.' : 'The runner sees that it was declined.' };
    case 'EXPIRED':
    case 'ERRAND_EXPIRED':
      return { ...base, title: 'Errand expired', body: 'The errand reached its deadline before a runner was chosen.', other: runner ? 'The requester can repost it.' : 'Runners can no longer offer. You can repost it.' };
    case 'ERRAND_CANCELLED':
      return { ...base, title: 'Errand cancelled', body: 'This errand was cancelled.', other: 'Everyone involved sees that it was cancelled.' };
    default:
      return { ...base, title: 'Offer closed', body: runner ? 'This offer is closed. Another runner may have been chosen, or the errand changed.' : 'This offer is closed.', other: 'The other person sees that the offer is closed.' };
  }
}

function describe(facts: JourneyFacts, pos: Position): NextStep {
  const { role, ids, offer, assignment, payment } = facts;
  const requester = role === 'REQUESTER';
  const assignmentHref = ids.assignmentId ? `/assignments/${ids.assignmentId}` : undefined;

  if (pos.ended) return describeEnded(role, pos.ended);

  if (pos.paused) {
    return {
      tone: 'wait',
      title: 'A dispute is open',
      body: 'Automatic completion is paused while the Urgent.ng team reviews it. You can add your side from the dispute page.',
      other: 'The other person sees the same dispute and can add their side.',
      ...(assignmentHref ? { cta: { label: 'View assignment', href: assignmentHref } } : {}),
    };
  }

  switch (pos.stage) {
    case 0:
      return {
        tone: 'wait',
        title: requester ? 'Waiting for offers' : 'Send your offer',
        body: requester ? 'Nearby runners have been told. Offers appear on your errand as they arrive, and you can answer, counter or select one.' : 'Set your price and estimate. The requester can accept, counter or decline.',
        other: requester ? 'Runners see your errand with approximate areas only. Exact addresses stay hidden.' : 'The requester sees your offer on their errand as soon as you send it.',
        ...(requester && ids.errandId ? { cta: { label: 'See offers', href: `/errands/${ids.errandId}` } } : {}),
      };

    case 1: {
      const href = ids.offerId ? `/offers/${ids.offerId}` : undefined;
      if (offer?.needsReconfirmation) {
        return {
          tone: requester ? 'wait' : 'action',
          title: requester ? 'Waiting for the runner to reconfirm' : 'Reconfirm your offer',
          body: requester ? 'You changed the errand after this offer came in. The runner must confirm the new details before you can select them.' : 'The requester changed the errand. Check the new details, then confirm your offer still stands.',
          other: requester ? 'The runner sees "Needs reconfirmation" and the new details.' : 'The requester cannot select you until you reconfirm.',
          ...(href ? { cta: { label: 'Open the offer', href } } : {}),
        };
      }
      if (offer?.awaitingParty === 'NONE') {
        return {
          tone: requester ? 'action' : 'wait',
          title: requester ? 'Terms agreed: select this runner' : 'Terms agreed: waiting to be selected',
          body: requester ? 'You and the runner agree on the price and time. Select them to start the job. They then have 30 minutes to accept.' : 'You and the requester agree on the price and time. The requester can now select you.',
          other: requester ? 'The runner sees that terms are agreed and waits for your choice.' : 'The requester sees that terms are agreed and can select you.',
          ...(requester && ids.errandId ? { cta: { label: 'Review and select', href: `/errands/${ids.errandId}` } } : {}),
        };
      }
      const myTurn = offer?.awaitingParty === role;
      return {
        tone: myTurn ? 'action' : 'wait',
        title: myTurn ? 'Your turn' : requester ? 'Waiting for the runner' : 'Waiting for the requester',
        body: myTurn ? 'Accept the latest price, counter it, or decline. Only the person whose turn it is can respond.' : 'You cannot counter again until they answer. You will be told as soon as they do.',
        other: myTurn ? (requester ? 'The runner sees that you are looking at their offer.' : 'The requester sees that it is your move.') : 'They see that it is their turn, with your latest price.',
        ...(href ? { cta: { label: myTurn ? 'Respond' : 'View negotiation', href } } : {}),
      };
    }

    case 2: {
      const deadline = assignment?.acceptanceDeadline ? lagosTime(assignment.acceptanceDeadline) : null;
      return {
        tone: requester ? 'wait' : 'action',
        title: requester ? 'Waiting for the runner to accept' : 'You were selected: accept or decline',
        body: requester
          ? `The runner has 30 minutes to answer${deadline ? ` (until ${deadline})` : ''}. Other offers stay open until they accept. If they do not answer, the errand reopens.`
          : `Accept${deadline ? ` before ${deadline}` : ' before the timer ends'} or the errand goes back to the requester. Exact addresses and contacts show once you accept.`,
        other: requester ? 'The runner sees a countdown and the errand summary.' : 'The requester sees "Runner selected" and waits for you.',
        ...(!requester && assignmentHref ? { cta: { label: 'Accept or decline', href: assignmentHref } } : {}),
      };
    }

    case 3: {
      const mine = requester ? payment?.confirmedByRequester : payment?.confirmedByRunner;
      const theirs = requester ? payment?.confirmedByRunner : payment?.confirmedByRequester;
      const href = ids.assignmentId ? `/assignments/${ids.assignmentId}/payment` : undefined;
      if (mine && !theirs) {
        return {
          tone: 'wait',
          title: 'Waiting for the other person to confirm payment terms',
          body: 'You confirmed how and when you will be paid. The errand can start once both of you confirm.',
          other: 'They see that you confirmed and are asked to confirm too.',
          ...(href ? { cta: { label: 'View payment terms', href } } : {}),
        };
      }
      return {
        tone: 'action',
        title: 'Agree how you will be paid',
        body: 'Pick the method and the timing, then confirm. Payment is made directly between the two of you. Urgent.ng records it and never holds money.',
        other: theirs ? 'They already confirmed and are waiting for you.' : 'They are asked to do the same. Changing the terms clears both confirmations.',
        ...(href ? { cta: { label: 'Set payment terms', href } } : {}),
      };
    }

    case 4: {
      const started = facts.errandStatus === 'IN_PROGRESS' || facts.errandStatus === 'PICKED_UP';
      const picked = facts.errandStatus === 'PICKED_UP';
      if (requester) {
        return {
          tone: 'wait',
          title: picked ? 'Item picked up' : started ? 'Your runner is on the way' : 'Waiting for the runner to start',
          body: picked ? 'The runner has the item and is heading to the drop-off. Follow progress live.' : started ? 'Follow the runner step by step. You can ask for a change to the amount, address or time before pickup.' : 'Payment terms are agreed. The runner can start at any time.',
          other: 'The runner sees the same steps and can add photos, delay notices or report a problem.',
          ...(ids.assignmentId ? { cta: { label: 'Track the errand', href: `/assignments/${ids.assignmentId}/track` } } : {}),
        };
      }
      return {
        tone: 'action',
        title: picked ? 'Deliver the item' : started ? 'Keep the errand moving' : 'Start the errand',
        body: picked ? 'Head to the drop-off, then mark it delivered. A photo is optional evidence.' : started ? 'Mark each step as you go. Tell the requester if you are delayed.' : 'Mark the errand started when you set off. Each step is visible to the requester.',
        other: 'The requester sees every step as it happens.',
        ...(ids.assignmentId ? { cta: { label: 'Open the errand steps', href: `/assignments/${ids.assignmentId}/run` } } : {}),
      };
    }

    case 5:
      return requester
        ? {
            tone: 'action',
            title: 'Confirm delivery',
            body: 'The runner marked it delivered. Confirm it is done, or open a dispute. If you do nothing it completes by itself after 24 hours.',
            other: 'The runner sees "Waiting for requester confirmation" and when it completes automatically.',
            ...(ids.assignmentId ? { cta: { label: 'Confirm or report', href: `/assignments/${ids.assignmentId}/confirm` } } : {}),
          }
        : {
            tone: 'wait',
            title: 'Waiting for the requester to confirm',
            body: 'You marked it delivered. It completes when they confirm, or automatically after 24 hours. An open dispute pauses that.',
            other: 'The requester is asked to confirm or open a dispute.',
          };

    default:
      return {
        tone: 'done',
        title: 'Completed: rate each other',
        body: requester ? 'The errand is complete. Rate your runner. Ratings stay hidden until you have both rated, or the window closes.' : 'The errand is complete. Rate the requester. Ratings stay hidden until you have both rated, or the window closes.',
        other: 'They are asked to rate you too. Chat stays open for 48 hours after completion.',
        ...(ids.assignmentId ? { cta: { label: 'Leave a rating', href: `/assignments/${ids.assignmentId}/rating` } } : {}),
      };
  }
}

export function buildJourney(facts: JourneyFacts): JourneyView {
  const pos = position(facts);
  const steps = LABELS[facts.role].map((label, index): JourneyStep => {
    const key = ['offers', 'negotiate', 'select', 'payment', 'run', 'confirm', 'rate'][index];
    if (index < pos.stage) return { key, label, state: 'done' };
    if (index === pos.stage) return { key, label, state: pos.ended || pos.paused ? 'stopped' : 'current' };
    return { key, label, state: 'upcoming' };
  });
  return { stage: pos.stage, steps, next: describe(facts, pos) };
}
