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

describe('cancellation guidance for a service', () => {
  it('blocks cancelling once the work has started or finished, in words about work', () => {
    const started = cancellationGuidance('REQUESTER', 'ACCEPTED', 'PICKED_UP', { flow: 'SERVICE' });
    expect(started).toMatchObject({ canCancel: false, nextAction: 'OPEN_DISPUTE' });
    expect(started.message).toMatch(/work has started/i);
    const finished = cancellationGuidance('RUNNER', 'ACCEPTED', 'DELIVERED', { flow: 'SERVICE' });
    expect(finished).toMatchObject({ canCancel: false, nextAction: 'COMPLETE_OR_DISPUTE' });
    expect(finished.message).toMatch(/work was finished/i);
  });

  it('still lets either side cancel before the work starts, and keeps the item wording for a delivery', () => {
    expect(cancellationGuidance('RUNNER', 'ACCEPTED', 'IN_PROGRESS', { flow: 'SERVICE' }).canCancel).toBe(true);
    expect(cancellationGuidance('RUNNER', 'ACCEPTED', 'PICKED_UP', { flow: 'TRANSIT' }).message).toMatch(/item has been picked up/i);
  });
});
