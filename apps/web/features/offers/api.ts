import type { components } from '@urgent/api-client';
import { api, apiResponse } from '@/lib/api/client';

export type OfferNegotiation = components['schemas']['OfferNegotiationDto'];
export type NegotiationEvent = components['schemas']['NegotiationEventDto'];
export type RunnerOffer = components['schemas']['RunnerOfferSummaryDto'];
export type RunnerOfferLimit = components['schemas']['RunnerOfferLimitDto'];
export type RunnerEligibility = components['schemas']['RunnerEligibilityDto'];
export type MarketplaceErrand = components['schemas']['MarketplaceErrandDto'];
export type AssignmentDetail = components['schemas']['AssignmentDetailDto'];
export type OfferTerms = components['schemas']['CounterOfferDto'];

export const offersApi = {
  negotiation: (id: string) => api<OfferNegotiation>(`/offers/${id}`),
  edit: (id: string, input: OfferTerms) =>
    api<components['schemas']['OfferDto']>(`/offers/${id}`, { method: 'PATCH', body: input }),
  counter: (id: string, input: OfferTerms) =>
    api<components['schemas']['OfferDto']>(`/offers/${id}/counter`, { method: 'POST', body: input }),
  acceptCounter: (id: string, expectedVersion: number) =>
    api<components['schemas']['OfferDto']>(`/offers/${id}/accept-counter`, { method: 'POST', body: { expectedVersion } }),
  reject: (id: string, expectedVersion: number) =>
    api<components['schemas']['OfferDto']>(`/offers/${id}/reject`, { method: 'POST', body: { expectedVersion } }),
  withdraw: (id: string) =>
    api<components['schemas']['OfferDto']>(`/offers/${id}/withdraw`, { method: 'POST' }),
  reconfirm: (id: string, expectedVersion: number) =>
    api<components['schemas']['OfferDto']>(`/offers/${id}/reconfirm`, { method: 'POST', body: { expectedVersion } }),
  submit: (errandId: string, input: components['schemas']['SubmitOfferDto'], idempotencyKey: string) =>
    api<components['schemas']['OfferDto']>(`/errands/${errandId}/offers`, {
      method: 'POST',
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  runnerOfferLimit: () => api<RunnerOfferLimit>('/runner/offer-limit'),
  runnerEligibility: () => api<RunnerEligibility>('/runner/eligibility'),
  runnerOffers: (filters: { status?: RunnerOffer['status']; cursor?: string; limit?: number }) =>
    apiResponse<RunnerOffer[]>('/runner/offers', { query: filters }),
  marketplaceErrand: (id: string) => api<MarketplaceErrand>(`/marketplace/errands/${id}`),
  assignment: (id: string) => apiResponse<AssignmentDetail>(`/assignments/${id}`),
  acceptAssignment: (id: string, idempotencyKey: string) =>
    api<components['schemas']['AssignmentDto']>(`/assignments/${id}/accept`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  declineAssignment: (id: string) =>
    api<components['schemas']['AssignmentDto']>(`/assignments/${id}/decline`, { method: 'POST' }),
};
