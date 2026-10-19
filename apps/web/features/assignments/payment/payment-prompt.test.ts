import { describe, expect, it } from 'vitest';
import { paymentPrompt } from './payment-prompt';

const base = { paymentMethod: null, paymentTiming: null, confirmedByRequesterAt: null, confirmedByRunnerAt: null, fullyConfirmed: false } as const;
const termsSet = { ...base, paymentMethod: 'CASH', paymentTiming: 'AT_DELIVERY' } as const;
const stamp = '2026-10-19T20:00:00.000Z';

describe('paymentPrompt', () => {
  it('asks the requester to set the terms first', () => {
    expect(paymentPrompt('REQUESTER', base)).toMatchObject({ step: 'SET_TERMS', badge: 'Needs you', needsAction: true });
  });

  it('words the heading for who pays and who is paid', () => {
    expect(paymentPrompt('REQUESTER', termsSet).title).toBe('Confirm how you will pay');
    expect(paymentPrompt('RUNNER', termsSet).title).toBe('Confirm how you will be paid');
    expect(paymentPrompt('REQUESTER', base).title).toBe('Choose how you will pay the runner');
  });

  it('tells the runner to wait, without pushing them', () => {
    expect(paymentPrompt('RUNNER', base)).toMatchObject({ step: 'WAIT_FOR_TERMS', badge: 'Not set', needsAction: false });
  });

  it('asks either side to confirm once terms exist', () => {
    expect(paymentPrompt('RUNNER', termsSet)).toMatchObject({ step: 'CONFIRM', badge: 'Confirm', needsAction: true });
    expect(paymentPrompt('REQUESTER', termsSet)).toMatchObject({ step: 'CONFIRM', needsAction: true });
  });

  it('stops asking a side that already confirmed', () => {
    const requesterDone = { ...termsSet, confirmedByRequesterAt: stamp };
    expect(paymentPrompt('REQUESTER', requesterDone)).toMatchObject({ step: 'WAIT_FOR_OTHER', badge: null, needsAction: false });
    expect(paymentPrompt('RUNNER', requesterDone)).toMatchObject({ step: 'CONFIRM', needsAction: true });
  });

  it('shows nothing when both confirmed or there is no agreement', () => {
    expect(paymentPrompt('RUNNER', { ...termsSet, confirmedByRequesterAt: stamp, confirmedByRunnerAt: stamp, fullyConfirmed: true })).toMatchObject({ step: 'DONE', needsAction: false });
    expect(paymentPrompt('RUNNER', undefined)).toMatchObject({ step: 'DONE', needsAction: false });
  });
});
