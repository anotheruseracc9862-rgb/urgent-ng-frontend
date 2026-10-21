/**
 * How an errand is carried out. TRANSIT moves something between places (delivery, pickup, shopping).
 * SERVICE is work done at one address (cleaning, plumbing, electrical work). Both walk the same statuses, so
 * the only difference on screen is the words and which fields show. All of those words live here.
 */

export type CategoryFlow = 'TRANSIT' | 'SERVICE';
export type RunnerStep = 'start' | 'pickup' | 'deliver';

/** Older payloads and test fixtures carry no flow: treat them as TRANSIT, the original behaviour. */
export function flowOf(source?: { flow?: CategoryFlow | null } | CategoryFlow | null): CategoryFlow {
  if (!source) return 'TRANSIT';
  const flow = typeof source === 'string' ? source : source.flow;
  return flow === 'SERVICE' ? 'SERVICE' : 'TRANSIT';
}

export const isService = (source?: Parameters<typeof flowOf>[0]): boolean => flowOf(source) === 'SERVICE';

/** The five milestones of a running errand. */
export const EXECUTION_STEPS: Record<CategoryFlow, readonly [string, string, string, string, string]> = {
  TRANSIT: ['Accepted', 'Started', 'Picked up', 'Delivered', 'Done'],
  SERVICE: ['Accepted', 'On the way', 'Working', 'Finished', 'Done'],
};

/** What the runner is doing, by errand status. */
export const DOING_NOW: Record<CategoryFlow, Record<string, string>> = {
  TRANSIT: { ACCEPTED: 'Ready to start', IN_PROGRESS: 'Heading to pickup', PICKED_UP: 'Heading to drop-off' },
  SERVICE: { ACCEPTED: 'Ready to start', IN_PROGRESS: 'Heading to the address', PICKED_UP: 'Working' },
};

/** Short status text on cards, by errand status. */
export const STATUS_LINE: Record<CategoryFlow, Record<string, string>> = {
  TRANSIT: { IN_PROGRESS: 'On the way to pickup', PICKED_UP: 'On the way to drop-off', DELIVERED: 'Delivered · confirm' },
  SERVICE: { IN_PROGRESS: 'On the way', PICKED_UP: 'Work in progress', DELIVERED: 'Finished · confirm' },
};

export interface StepCopy {
  title: string;
  action: string;
  /** Explains the step in the confirm dialog. */
  confirm: string;
  /** What to read once the step is recorded. */
  recorded: string;
  noteLabel?: string;
  photoLabel?: string;
  photoRequired: boolean;
}

export const STEP_COPY: Record<CategoryFlow, Record<RunnerStep, StepCopy>> = {
  TRANSIT: {
    start: {
      title: 'Step 1 of 3 · Start the errand',
      action: 'Start errand',
      confirm: 'Confirm you are ready to begin. The requester will be notified.',
      recorded: 'Errand started. Next: collect the item, then record pickup.',
      photoRequired: false,
    },
    pickup: {
      title: 'Step 2 of 3 · Record pickup',
      action: 'Confirm pickup',
      confirm: 'Confirm you have collected the item. Your note and any photo will be shared with the requester.',
      recorded: 'Pickup recorded. Next: take it to the drop-off, then record delivery below.',
      noteLabel: 'Pickup note',
      photoLabel: 'Optional photo evidence',
      photoRequired: false,
    },
    deliver: {
      title: 'Step 3 of 3 · Record delivery',
      action: 'Confirm delivery',
      confirm: 'Confirm you have delivered the item. Your evidence will be shared with the requester, who can then confirm completion.',
      recorded: 'Delivery recorded. The requester now confirms it, or it completes by itself after 24 hours.',
      noteLabel: 'Recipient or delivery note',
      photoLabel: 'Optional photo evidence',
      photoRequired: false,
    },
  },
  SERVICE: {
    start: {
      title: 'Step 1 of 3 · Head to the address',
      action: 'I am on my way',
      confirm: 'Confirm you are heading to the address. The requester will be notified.',
      recorded: 'You are on your way. Next: arrive, take a before photo and start the work.',
      photoRequired: false,
    },
    pickup: {
      title: 'Step 2 of 3 · Start the work',
      action: 'Start work',
      confirm: 'Confirm you have arrived and are starting. Your note and before photo will be shared with the requester.',
      recorded: 'Work started. Next: finish the job, then record it below with an after photo.',
      noteLabel: 'Before note',
      photoLabel: 'Before photo (required)',
      photoRequired: true,
    },
    deliver: {
      title: 'Step 3 of 3 · Finish the work',
      action: 'Finish work',
      confirm: 'Confirm the work is done. Your note and after photo will be shared with the requester, who can then confirm completion.',
      recorded: 'Work finished. The requester now confirms it, or it completes by itself after 24 hours.',
      noteLabel: 'What was done',
      photoLabel: 'After photo (required)',
      photoRequired: true,
    },
  },
};

/** Why a cancel is blocked once the work is under way. */
export const CANCEL_BLOCKED: Record<CategoryFlow, { started: string; finished: string; startedShort: string; finishedShort: string }> = {
  TRANSIT: {
    started: 'The item has been picked up. Do not abandon the errand; open a dispute instead.',
    finished: 'The item was delivered. Confirm completion or open a dispute instead of cancelling.',
    startedShort: 'The item has been picked up. Cancellation is blocked; open a dispute from the assignment hub.',
    finishedShort: 'The errand was delivered. Confirm completion or open a dispute from the assignment hub.',
  },
  SERVICE: {
    started: 'The work has started. Do not abandon the job; open a dispute instead.',
    finished: 'The work was finished. Confirm completion or open a dispute instead of cancelling.',
    startedShort: 'The work has started. Cancellation is blocked; open a dispute from the assignment hub.',
    finishedShort: 'The work was finished. Confirm completion or open a dispute from the assignment hub.',
  },
};

/** Words for the places on a form, a card or a review. */
export const PLACE_COPY: Record<CategoryFlow, { destination: string; destinationArea: string; contact: string }> = {
  TRANSIT: { destination: 'Drop-off location', destinationArea: 'Drop-off area', contact: 'Drop-off contact' },
  SERVICE: { destination: 'Service address', destinationArea: 'Service area', contact: 'Contact at the address' },
};

/** The tick the requester gives before posting. */
export const CONFIRM_COPY: Record<CategoryFlow, string> = {
  TRANSIT: 'I confirm this errand does not include prohibited items.',
  SERVICE: 'I confirm this job does not involve anything illegal or prohibited.',
};

/** Groups for the category picker, so "go and do" and "come and do" read as two clear choices. */
export const FLOW_GROUP_LABEL: Record<CategoryFlow, string> = {
  TRANSIT: 'Run an errand',
  SERVICE: 'Book a service',
};

/** Dispute types a person can pick, by flow. The common ones come last. */
export const DISPUTE_TYPE_ORDER: Record<CategoryFlow, readonly string[]> = {
  TRANSIT: ['ITEM_NOT_DELIVERED', 'ITEM_DAMAGED', 'ITEM_MISSING', 'WRONG_ITEM', 'UNAUTHORIZED_CHANGE', 'SAFETY_INCIDENT', 'OTHER'],
  SERVICE: ['SERVICE_NOT_DONE', 'POOR_QUALITY', 'PROPERTY_DAMAGE', 'UNAUTHORIZED_CHANGE', 'SAFETY_INCIDENT', 'OTHER'],
};
