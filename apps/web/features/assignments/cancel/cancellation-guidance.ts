export type CancellationRole = 'REQUESTER' | 'RUNNER';

export interface CancellationGuidance {
  message: string;
  canCancel: boolean;
  nextAction: 'DECLINE' | 'OPEN_DISPUTE' | 'COMPLETE_OR_DISPUTE' | null;
}

export function cancellationGuidance(
  role: CancellationRole,
  assignmentStatus: string,
  errandStatus: string,
): CancellationGuidance {
  if (assignmentStatus === 'PENDING_ACCEPTANCE') {
    return role === 'RUNNER'
      ? { message: 'You have not accepted this assignment. Decline it instead of cancelling.', canCancel: false, nextAction: 'DECLINE' }
      : { message: 'The runner has not accepted yet. Cancelling will close this errand.', canCancel: true, nextAction: null };
  }
  if (assignmentStatus !== 'ACCEPTED') {
    return { message: 'This assignment is no longer active and cannot be cancelled.', canCancel: false, nextAction: null };
  }
  if (errandStatus === 'ACCEPTED') {
    return role === 'RUNNER'
      ? { message: 'Work has not started. Cancelling returns the errand to the marketplace.', canCancel: true, nextAction: null }
      : { message: 'Work has not started. Cancelling closes the errand for both parties.', canCancel: true, nextAction: null };
  }
  if (errandStatus === 'IN_PROGRESS') {
    return role === 'RUNNER'
      ? { message: 'Work has started. Cancelling ends the errand and records the stage.', canCancel: true, nextAction: null }
      : { message: 'The runner has started work. Cancelling ends the errand and records the stage.', canCancel: true, nextAction: null };
  }
  if (errandStatus === 'PICKED_UP') {
    return { message: 'The item has been picked up. Do not abandon the errand; open a dispute instead.', canCancel: false, nextAction: 'OPEN_DISPUTE' };
  }
  if (errandStatus === 'DELIVERED') {
    return { message: 'The item was delivered. Confirm completion or open a dispute instead of cancelling.', canCancel: false, nextAction: 'COMPLETE_OR_DISPUTE' };
  }
  if (errandStatus === 'COMPLETED') {
    return { message: 'The errand is complete and cannot be cancelled.', canCancel: false, nextAction: null };
  }
  return { message: 'This errand cannot be cancelled in its current state.', canCancel: false, nextAction: null };
}
