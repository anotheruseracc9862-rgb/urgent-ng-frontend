import { describe, expect, it } from 'vitest';
import { buildJourney, type JourneyFacts, type JourneyRole } from './journey';

const view = (facts: Partial<JourneyFacts> & { role: JourneyRole }) => buildJourney(facts);
const states = (v: ReturnType<typeof buildJourney>) => v.steps.map((s) => s.state);

describe('journey stage', () => {
  it('requester with no offer yet is at Offers', () => {
    const v = view({ role: 'REQUESTER', errandStatus: 'OPEN' });
    expect(v.stage).toBe(0);
    expect(v.steps[0]).toMatchObject({ label: 'Offers', state: 'current' });
    expect(states(v).slice(1).every((s) => s === 'upcoming')).toBe(true);
  });

  it('an active offer is at Negotiate, for both sides', () => {
    const offer = { status: 'ACTIVE' };
    expect(view({ role: 'RUNNER', offer }).stage).toBe(1);
    expect(view({ role: 'REQUESTER', offer }).stage).toBe(1);
    expect(states(view({ role: 'RUNNER', offer }))).toEqual(['done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('labels follow the role', () => {
    expect(view({ role: 'RUNNER' }).steps.map((s) => s.label)).toEqual(['Offer sent', 'Negotiate', 'Accept job', 'Payment terms', 'Run errand', 'Delivered', 'Rate']);
    expect(view({ role: 'REQUESTER' }).steps.map((s) => s.label)).toEqual(['Offers', 'Negotiate', 'Select runner', 'Payment terms', 'Errand runs', 'Confirm', 'Rate']);
  });

  it('a selected offer, or a pending assignment, is at Select / Accept', () => {
    expect(view({ role: 'RUNNER', offer: { status: 'SELECTED' } }).stage).toBe(2);
    expect(view({ role: 'RUNNER', errandStatus: 'RUNNER_SELECTED', assignment: { status: 'PENDING_ACCEPTANCE' } }).stage).toBe(2);
  });

  it('accepted: payment terms until both confirm, then the errand runs', () => {
    const assignment = { status: 'ACCEPTED' };
    expect(view({ role: 'RUNNER', errandStatus: 'ACCEPTED', assignment, payment: { fullyConfirmed: false } }).stage).toBe(3);
    expect(view({ role: 'RUNNER', errandStatus: 'ACCEPTED', assignment }).stage).toBe(3);
    expect(view({ role: 'RUNNER', errandStatus: 'ACCEPTED', assignment, payment: { fullyConfirmed: true } }).stage).toBe(4);
  });

  it('in progress and picked up are the errand running', () => {
    const assignment = { status: 'ACCEPTED' };
    expect(view({ role: 'RUNNER', errandStatus: 'IN_PROGRESS', assignment }).stage).toBe(4);
    expect(view({ role: 'REQUESTER', errandStatus: 'PICKED_UP', assignment }).stage).toBe(4);
  });

  it('delivered is the confirm step', () => {
    expect(view({ role: 'REQUESTER', errandStatus: 'DELIVERED', assignment: { status: 'ACCEPTED' } }).stage).toBe(5);
  });

  it('completed is Rate, with every step before it done', () => {
    const v = view({ role: 'RUNNER', errandStatus: 'COMPLETED', assignment: { status: 'COMPLETED' } });
    expect(v.stage).toBe(6);
    expect(states(v).slice(0, 6).every((s) => s === 'done')).toBe(true);
    expect(v.steps[6].state).toBe('current');
  });
});

describe('journey stopped', () => {
  it.each(['DECLINED', 'TIMED_OUT', 'CANCELLED'])('assignment %s stops the bar and shows no current step', (status) => {
    const v = view({ role: 'REQUESTER', assignment: { status } });
    expect(v.steps.filter((s) => s.state === 'stopped')).toHaveLength(1);
    expect(v.steps.some((s) => s.state === 'current')).toBe(false);
  });

  it.each(['WITHDRAWN', 'REJECTED', 'EXPIRED', 'CLOSED'])('offer %s stops at Negotiate', (status) => {
    const v = view({ role: 'RUNNER', offer: { status } });
    expect(v.stage).toBe(1);
    expect(v.steps[1].state).toBe('stopped');
  });

  it('a dispute stops the bar at the confirm step', () => {
    const v = view({ role: 'REQUESTER', errandStatus: 'DISPUTED', assignment: { status: 'ACCEPTED' } });
    expect(v.steps[5].state).toBe('stopped');
  });

  it('a cancelled or expired errand with no offer stops at the start', () => {
    expect(view({ role: 'REQUESTER', errandStatus: 'CANCELLED' }).steps[0].state).toBe('stopped');
    expect(view({ role: 'REQUESTER', errandStatus: 'EXPIRED' }).steps[0].state).toBe('stopped');
  });
});
