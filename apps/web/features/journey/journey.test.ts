import { describe, expect, it } from 'vitest';
import { buildJourney, type JourneyFacts, type JourneyRole } from './journey';

const ids = { errandId: 'e1', offerId: 'o1', assignmentId: 'a1' };
const view = (facts: Partial<JourneyFacts> & { role: JourneyRole }) => buildJourney({ ids, ...facts });
const states = (v: ReturnType<typeof buildJourney>) => v.steps.map((s) => s.state);

describe('journey stage', () => {
  it('requester with no offer yet waits at stage 0', () => {
    const v = view({ role: 'REQUESTER', errandStatus: 'OPEN' });
    expect(v.stage).toBe(0);
    expect(v.steps[0].label).toBe('Offers');
    expect(v.next.tone).toBe('wait');
    expect(v.next.cta?.href).toBe('/errands/e1');
  });

  it('an active offer is negotiation, and whose turn it is decides who acts', () => {
    const mine = view({ role: 'RUNNER', offer: { status: 'ACTIVE', awaitingParty: 'RUNNER', needsReconfirmation: false } });
    const theirs = view({ role: 'RUNNER', offer: { status: 'ACTIVE', awaitingParty: 'REQUESTER', needsReconfirmation: false } });
    expect(mine.stage).toBe(1);
    expect(mine.next).toMatchObject({ tone: 'action', title: 'Your turn' });
    expect(theirs.next).toMatchObject({ tone: 'wait', title: 'Waiting for the requester' });
    expect(states(mine)).toEqual(['done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('agreed terms: the requester selects, the runner waits to be selected', () => {
    const offer = { status: 'ACTIVE', awaitingParty: 'NONE' as const, needsReconfirmation: false };
    expect(view({ role: 'REQUESTER', offer }).next).toMatchObject({ tone: 'action', cta: { href: '/errands/e1' } });
    expect(view({ role: 'RUNNER', offer }).next.tone).toBe('wait');
  });

  it('a changed errand needs the runner to reconfirm before anyone can select', () => {
    const offer = { status: 'ACTIVE', awaitingParty: 'REQUESTER' as const, needsReconfirmation: true };
    expect(view({ role: 'RUNNER', offer }).next).toMatchObject({ tone: 'action', title: 'Reconfirm your offer' });
    expect(view({ role: 'REQUESTER', offer }).next).toMatchObject({ tone: 'wait', title: 'Waiting for the runner to reconfirm' });
  });

  it('selection: the runner accepts, the requester waits, both see the 30-minute rule', () => {
    const assignment = { status: 'PENDING_ACCEPTANCE', acceptanceDeadline: '2026-10-19T15:30:00.000Z' };
    const runner = view({ role: 'RUNNER', errandStatus: 'RUNNER_SELECTED', assignment });
    const requester = view({ role: 'REQUESTER', errandStatus: 'RUNNER_SELECTED', assignment });
    expect(runner.stage).toBe(2);
    expect(runner.next).toMatchObject({ tone: 'action', cta: { href: '/assignments/a1' } });
    expect(requester.next.tone).toBe('wait');
    expect(requester.next.body).toMatch(/30 minutes/);
  });

  it('accepted but payment not confirmed: payment terms, then run once both confirm', () => {
    const assignment = { status: 'ACCEPTED' };
    const none = { confirmedByRequester: false, confirmedByRunner: false, fullyConfirmed: false };
    expect(view({ role: 'RUNNER', errandStatus: 'ACCEPTED', assignment, payment: none }).stage).toBe(3);
    const mine = view({ role: 'REQUESTER', errandStatus: 'ACCEPTED', assignment, payment: { ...none, confirmedByRequester: true } });
    expect(mine.next).toMatchObject({ tone: 'wait', title: 'Waiting for the other person to confirm payment terms' });
    const both = { confirmedByRequester: true, confirmedByRunner: true, fullyConfirmed: true };
    expect(view({ role: 'RUNNER', errandStatus: 'ACCEPTED', assignment, payment: both }).stage).toBe(4);
  });

  it('while running: the runner acts, the requester tracks', () => {
    const assignment = { status: 'ACCEPTED' };
    const runner = view({ role: 'RUNNER', errandStatus: 'IN_PROGRESS', assignment });
    const requester = view({ role: 'REQUESTER', errandStatus: 'PICKED_UP', assignment });
    expect(runner.stage).toBe(4);
    expect(runner.next.cta?.href).toBe('/assignments/a1/run');
    expect(requester.next.cta?.href).toBe('/assignments/a1/track');
    expect(requester.next.title).toBe('Item picked up');
  });

  it('delivered: the requester confirms, the runner waits, 24 hours is named', () => {
    const assignment = { status: 'ACCEPTED' };
    const requester = view({ role: 'REQUESTER', errandStatus: 'DELIVERED', assignment });
    const runner = view({ role: 'RUNNER', errandStatus: 'DELIVERED', assignment });
    expect(requester).toMatchObject({ stage: 5, next: { tone: 'action', cta: { href: '/assignments/a1/confirm' } } });
    expect(requester.next.body).toMatch(/24 hours/);
    expect(runner.next.tone).toBe('wait');
  });

  it('a dispute pauses the journey for both', () => {
    const v = view({ role: 'REQUESTER', errandStatus: 'DISPUTED', assignment: { status: 'ACCEPTED' } });
    expect(v.next.title).toBe('A dispute is open');
    expect(v.steps[5].state).toBe('stopped');
  });

  it('completed: rate each other', () => {
    const v = view({ role: 'RUNNER', errandStatus: 'COMPLETED', assignment: { status: 'COMPLETED' } });
    expect(v.stage).toBe(6);
    expect(v.next).toMatchObject({ tone: 'done', cta: { href: '/assignments/a1/rating' } });
    expect(states(v).slice(0, 6).every((s) => s === 'done')).toBe(true);
  });
});

describe('journey ending early', () => {
  it.each([
    ['DECLINED', 'Job declined'],
    ['TIMED_OUT', 'Acceptance window ended'],
    ['CANCELLED', 'Cancelled'],
  ])('assignment %s stops the bar with a reason', (status, title) => {
    const v = view({ role: 'REQUESTER', assignment: { status } });
    expect(v.next).toMatchObject({ tone: 'stopped', title });
    expect(v.steps.some((s) => s.state === 'stopped')).toBe(true);
    expect(v.steps.some((s) => s.state === 'current')).toBe(false);
  });

  it.each(['WITHDRAWN', 'REJECTED', 'EXPIRED', 'CLOSED'])('offer %s stops at negotiation', (status) => {
    const v = view({ role: 'RUNNER', offer: { status, awaitingParty: 'NONE', needsReconfirmation: false } });
    expect(v.stage).toBe(1);
    expect(v.next.tone).toBe('stopped');
  });

  it('says what the other side sees in every state', () => {
    const cases: JourneyFacts[] = [
      { role: 'REQUESTER', errandStatus: 'OPEN', ids },
      { role: 'RUNNER', offer: { status: 'ACTIVE', awaitingParty: 'RUNNER', needsReconfirmation: false }, ids },
      { role: 'RUNNER', errandStatus: 'DELIVERED', assignment: { status: 'ACCEPTED' }, ids },
      { role: 'REQUESTER', assignment: { status: 'TIMED_OUT' }, ids },
    ];
    for (const facts of cases) {
      expect(buildJourney(facts).next.other.length).toBeGreaterThan(10);
    }
  });
});
