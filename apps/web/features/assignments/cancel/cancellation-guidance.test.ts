import { describe, expect, it } from 'vitest';
import { cancellationGuidance } from './cancellation-guidance';

describe('assignment cancellation stage matrix', () => {
  it.each([
    ['REQUESTER', 'PENDING_ACCEPTANCE', 'RUNNER_SELECTED', true, null],
    ['RUNNER', 'PENDING_ACCEPTANCE', 'RUNNER_SELECTED', false, 'DECLINE'],
    ['REQUESTER', 'ACCEPTED', 'ACCEPTED', true, null],
    ['RUNNER', 'ACCEPTED', 'ACCEPTED', true, null],
    ['REQUESTER', 'ACCEPTED', 'IN_PROGRESS', true, null],
    ['RUNNER', 'ACCEPTED', 'IN_PROGRESS', true, null],
    ['REQUESTER', 'ACCEPTED', 'PICKED_UP', false, 'OPEN_DISPUTE'],
    ['RUNNER', 'ACCEPTED', 'PICKED_UP', false, 'OPEN_DISPUTE'],
    ['REQUESTER', 'ACCEPTED', 'DELIVERED', false, 'COMPLETE_OR_DISPUTE'],
    ['RUNNER', 'ACCEPTED', 'DELIVERED', false, 'COMPLETE_OR_DISPUTE'],
    ['REQUESTER', 'COMPLETED', 'COMPLETED', false, null],
    ['RUNNER', 'CANCELLED', 'CANCELLED', false, null],
  ] as const)('%s %s / %s has explicit stage guidance', (role, assignmentStatus, errandStatus, canCancel, nextAction) => {
    const guidance = cancellationGuidance(role, assignmentStatus, errandStatus);
    expect(guidance.message).toBeTruthy();
    expect(guidance.canCancel).toBe(canCancel);
    expect(guidance.nextAction).toBe(nextAction);
  });
});
