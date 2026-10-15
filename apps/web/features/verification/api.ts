import type { components } from '@urgent/api-client';
import { api } from '@/lib/api/client';

export type VerificationOverview = components['schemas']['VerificationOverviewDto'];
export type VerificationAttempt = components['schemas']['VerificationAttemptDto'];
export type VerificationInput = components['schemas']['StartVerificationDto'];
export type BillingOrder = components['schemas']['OrderDto'];

export const verificationApi = {
  overview: () => api<VerificationOverview>('/verification'),
  attempt: (id: string) => api<VerificationAttempt>(`/verification/attempts/${id}`),
  start: (input: VerificationInput, idempotencyKey: string) =>
    api<VerificationAttempt>('/verification/attempts', {
      method: 'POST',
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  createFeeOrder: (idempotencyKey: string) =>
    api<BillingOrder>('/billing/orders', {
      method: 'POST',
      body: { type: 'VERIFICATION_FEE' },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  getOrder: (id: string) => api<BillingOrder>(`/billing/orders/${id}`),
  verifyOrder: (id: string) =>
    api<BillingOrder>(`/billing/orders/${id}/verify`, { method: 'POST', body: {} }),
};
