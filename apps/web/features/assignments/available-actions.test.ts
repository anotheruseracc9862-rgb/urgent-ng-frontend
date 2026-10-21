import { describe, expect, it } from 'vitest';
import { availableActions } from './available-actions';

const on = (role: 'REQUESTER' | 'RUNNER', assignment: string, errand: string) =>
  Object.entries(availableActions(role, assignment, errand)).filter(([, allowed]) => allowed).map(([name]) => name).sort();

describe('a service has nobody to follow', () => {
  it('never offers live tracking, at any stage, and leaves everything else as it is', () => {
    for (const stage of ['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP', 'DELIVERED']) {
      expect(availableActions('REQUESTER', 'ACCEPTED', stage, 'SERVICE').trackRunner).toBe(false);
      expect(availableActions('REQUESTER', 'ACCEPTED', stage, { flow: 'SERVICE' }).trackRunner).toBe(false);
      expect(availableActions('REQUESTER', 'ACCEPTED', stage, 'TRANSIT').trackRunner).toBe(true);
    }
    expect(availableActions('REQUESTER', 'ACCEPTED', 'IN_PROGRESS', 'SERVICE')).toMatchObject({ cancel: true, shareProgress: true, paymentTerms: true, dispute: true });
  });
});

describe('available assignment actions', () => {
  it('before the errand starts: change, cancel, no-show and payment terms are all open', () => {
    expect(on('RUNNER', 'ACCEPTED', 'ACCEPTED')).toEqual(['cancel', 'changeRequest', 'continueErrand', 'dispute', 'noShow', 'paymentTerms', 'reportProblems', 'shareProgress']);
    expect(on('REQUESTER', 'ACCEPTED', 'ACCEPTED')).toEqual(['cancel', 'changeRequest', 'dispute', 'noShow', 'paymentTerms', 'shareProgress', 'trackRunner']);
  });

  it('while running it is the same until pickup', () => {
    expect(availableActions('RUNNER', 'ACCEPTED', 'IN_PROGRESS')).toMatchObject({ cancel: true, changeRequest: true, noShow: true });
  });

  it('after pickup: no cancel, no change request, no no-show. A dispute is the way out', () => {
    const picked = availableActions('RUNNER', 'ACCEPTED', 'PICKED_UP');
    expect(picked).toMatchObject({ cancel: false, changeRequest: false, noShow: false, dispute: true, continueErrand: true, paymentTerms: true });
    expect(availableActions('REQUESTER', 'ACCEPTED', 'PICKED_UP')).toMatchObject({ cancel: false, changeRequest: false, dispute: true, trackRunner: true });
  });

  it('delivered: the runner has no more steps, the requester can confirm', () => {
    expect(availableActions('RUNNER', 'ACCEPTED', 'DELIVERED')).toMatchObject({ continueErrand: false, confirmDelivery: false, cancel: false, dispute: true });
    expect(availableActions('REQUESTER', 'ACCEPTED', 'DELIVERED')).toMatchObject({ confirmDelivery: true, cancel: false, changeRequest: false });
  });

  it('only the requester confirms, only the runner runs the steps', () => {
    expect(availableActions('RUNNER', 'ACCEPTED', 'DELIVERED').confirmDelivery).toBe(false);
    expect(availableActions('REQUESTER', 'ACCEPTED', 'IN_PROGRESS').continueErrand).toBe(false);
    expect(availableActions('RUNNER', 'ACCEPTED', 'IN_PROGRESS').trackRunner).toBe(false);
  });

  it('a disputed errand offers no more actions through these buttons', () => {
    expect(availableActions('REQUESTER', 'ACCEPTED', 'DISPUTED')).toMatchObject({ cancel: false, changeRequest: false, dispute: false, shareProgress: false, confirmDelivery: false });
  });

  it('completed: only rating. Declined, timed out, cancelled and pending: nothing', () => {
    expect(on('RUNNER', 'COMPLETED', 'COMPLETED')).toEqual(['rate']);
    for (const status of ['PENDING_ACCEPTANCE', 'DECLINED', 'TIMED_OUT', 'CANCELLED']) {
      expect(on('RUNNER', status, 'OPEN')).toEqual([]);
    }
  });
});
