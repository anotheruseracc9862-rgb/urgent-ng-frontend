import type { components } from '@urgent/api-client';
import type { AssignmentRole } from '../available-actions';

type Agreement = Pick<
  components['schemas']['PaymentAgreementDto'],
  'paymentMethod' | 'paymentTiming' | 'confirmedByRequesterAt' | 'confirmedByRunnerAt' | 'fullyConfirmed'
>;

export interface PaymentPrompt {
  /** What this person should do next, or `DONE` when both sides have confirmed. */
  step: 'SET_TERMS' | 'WAIT_FOR_TERMS' | 'CONFIRM' | 'WAIT_FOR_OTHER' | 'DONE';
  /** Heading for the banner and the chat card, worded for this person's role. */
  title: string;
  /** Short marker for the action button, or null when nothing is needed. */
  badge: string | null;
  /** One sentence for the banner, or null when nothing is needed. */
  message: string | null;
  /** The banner and the marker show only while the person has something to do. */
  needsAction: boolean;
}

/**
 * The payment agreement is optional and never blocks the errand. This only decides how loudly to
 * nudge: the requester sets the terms, then each side confirms for themselves.
 */
export function paymentPrompt(role: AssignmentRole, agreement: Agreement | null | undefined): PaymentPrompt {
  const none: PaymentPrompt = { step: 'DONE', title: '', badge: null, message: null, needsAction: false };
  if (!agreement || agreement.fullyConfirmed) return none;

  const termsSet = Boolean(agreement.paymentMethod && agreement.paymentTiming);
  const mine = role === 'REQUESTER' ? agreement.confirmedByRequesterAt : agreement.confirmedByRunnerAt;

  if (!termsSet) {
    return role === 'REQUESTER'
      ? { step: 'SET_TERMS', title: 'Choose how you will pay the runner', badge: 'Needs you', message: 'Pick a payment method and when you will pay. The runner confirms after you.', needsAction: true }
      : { step: 'WAIT_FOR_TERMS', title: 'Waiting for the requester to set payment terms', badge: 'Not set', message: 'The requester pays you, so they choose how. You can set it yourself, or ask them in chat.', needsAction: false };
  }
  if (!mine) {
    return role === 'REQUESTER'
      ? { step: 'CONFIRM', title: 'Confirm how you will pay', badge: 'Confirm', message: 'Check the method and timing, then confirm this is how you will pay the runner.', needsAction: true }
      : { step: 'CONFIRM', title: 'Confirm how you will be paid', badge: 'Confirm', message: 'The requester set the payment terms. Confirm they work for you, or change them.', needsAction: true };
  }
  return { ...none, step: 'WAIT_FOR_OTHER' };
}
