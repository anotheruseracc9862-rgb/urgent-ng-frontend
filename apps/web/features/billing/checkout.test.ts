import { describe, expect, it } from 'vitest';
import type { Order } from './api';
import { gatewayUrl, nextStepForOrder } from './checkout';

const order = (patch: Partial<Order>): Order => ({
  id: 'o1', type: 'RUNNER_PRO', status: 'PENDING', amountMinor: 500000, vatMinor: 34884,
  currency: 'NGN', errandId: null, payment: null, paidAt: null, createdAt: '2026-10-15T00:00:00Z', ...patch,
});

describe('checkout helpers', () => {
  it('accepts only an https gateway url', () => {
    expect(gatewayUrl(order({ payment: { reference: 'r', status: 'INITIATED', authorizationUrl: 'https://checkout.paystack.com/x' } })))
      .toBe('https://checkout.paystack.com/x');
    expect(gatewayUrl(order({ payment: { reference: 'r', status: 'INITIATED', authorizationUrl: 'http://evil.test/x' } }))).toBeNull();
    expect(gatewayUrl(order({ payment: { reference: 'r', status: 'INITIATED', authorizationUrl: 'javascript:alert(1)' } }))).toBeNull();
    expect(gatewayUrl(order({ payment: null }))).toBeNull();
  });

  it('goes to the gateway while pending and to checkout once settled', () => {
    const payment = { reference: 'r', status: 'INITIATED' as const, authorizationUrl: 'https://checkout.paystack.com/x' };
    expect(nextStepForOrder(order({ payment }))).toEqual({ kind: 'gateway', url: 'https://checkout.paystack.com/x' });
    expect(nextStepForOrder(order({ status: 'PAID', payment }))).toEqual({ kind: 'checkout', path: '/checkout/o1' });
  });
});
