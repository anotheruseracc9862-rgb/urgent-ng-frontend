/**
 * Which actions an assignment offers right now. One place, mirroring what the backend allows, so a
 * button is never shown that the server would refuse. The pages these buttons open also check the
 * state themselves; this keeps the dead ends off the screen in the first place.
 *
 * With the assignment ACCEPTED, by errand status:
 *
 *   Payment terms        any status
 *   Change request       ACCEPTED, IN_PROGRESS            (location and time freeze at pickup)
 *   Cancel               ACCEPTED, IN_PROGRESS            (after pickup: open a dispute)
 *   No-show report       ACCEPTED, IN_PROGRESS
 *   Delay, problem,      ACCEPTED to DELIVERED (receipts); delays and problems end at DELIVERED
 *     receipt
 *   Dispute, share       ACCEPTED to DELIVERED
 *   Runner steps         ACCEPTED, IN_PROGRESS, PICKED_UP
 *   Confirm delivery     DELIVERED, requester only
 */

import { isService, type CategoryFlow } from '@/features/reference/flow';

export type AssignmentRole = 'REQUESTER' | 'RUNNER';

export interface AvailableActions {
  continueErrand: boolean;
  trackRunner: boolean;
  reportProblems: boolean;
  changeRequest: boolean;
  paymentTerms: boolean;
  cancel: boolean;
  noShow: boolean;
  dispute: boolean;
  shareProgress: boolean;
  confirmDelivery: boolean;
  rate: boolean;
}

const BEFORE_PICKUP = ['ACCEPTED', 'IN_PROGRESS'];
const WORKING = [...BEFORE_PICKUP, 'PICKED_UP'];
const ACTIVE = [...WORKING, 'DELIVERED'];

/**
 * `flow` is the errand's category flow. A service happens at one address, so there is no runner to follow:
 * no live tracking, however far along it is.
 */
export function availableActions(
  role: AssignmentRole,
  assignmentStatus: string,
  errandStatus: string,
  flow?: CategoryFlow | { flow?: CategoryFlow | null } | null,
): AvailableActions {
  const accepted = assignmentStatus === 'ACCEPTED';
  const requester = role === 'REQUESTER';
  return {
    continueErrand: !requester && accepted && WORKING.includes(errandStatus),
    trackRunner: requester && accepted && ACTIVE.includes(errandStatus) && !isService(flow),
    reportProblems: !requester && accepted && ACTIVE.includes(errandStatus),
    changeRequest: accepted && BEFORE_PICKUP.includes(errandStatus),
    paymentTerms: accepted,
    cancel: accepted && BEFORE_PICKUP.includes(errandStatus),
    noShow: accepted && BEFORE_PICKUP.includes(errandStatus),
    dispute: accepted && ACTIVE.includes(errandStatus),
    shareProgress: accepted && ACTIVE.includes(errandStatus),
    confirmDelivery: requester && accepted && errandStatus === 'DELIVERED',
    rate: assignmentStatus === 'COMPLETED',
  };
}
