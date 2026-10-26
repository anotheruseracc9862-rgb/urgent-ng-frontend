import type { components, operations } from '@urgent/api-client';
import { api, apiResponse } from '@/lib/api/client';

export type Errand = components['schemas']['ErrandDto'];
export type ErrandSummary = components['schemas']['ErrandSummaryDto'];
export type CreateErrand = components['schemas']['CreateErrandDto'];
export type UpdateErrand = components['schemas']['UpdateErrandDto'];
export type PublishErrand = components['schemas']['PublishErrandDto'];
export type CancelErrand = components['schemas']['CancelErrandDto'];
export type ErrandOffer = components['schemas']['OfferListItemDto'];
export type ExecutionEvent = components['schemas']['ExecutionEventDto'];
export type OfferSort = NonNullable<NonNullable<operations['Offers_list']['parameters']['query']>['sort']>;

export interface MyErrandFilters {
  tab?: 'DRAFT' | 'OPEN' | 'ACTIVE' | 'PAST' | 'ATTENTION';
  sort?: 'RECENT' | 'NEEDS_ATTENTION' | 'HIGHEST_AMOUNT';
  q?: string;
  cursor?: string;
  limit?: number;
}

export const errandsApi = {
  get: (id: string) => api<Errand>(`/errands/${id}`),
  create: (input: CreateErrand) => api<Errand>('/errands', { method: 'POST', body: input }),
  update: (id: string, input: UpdateErrand) => api<Errand>(`/errands/${id}`, { method: 'PATCH', body: input }),
  mine: (filters: MyErrandFilters) => apiResponse<ErrandSummary[]>('/errands/mine', {
    query: {
      tab: filters.tab,
      sort: filters.sort,
      q: filters.q,
      cursor: filters.cursor,
      limit: filters.limit,
    },
  }),
  publish: (id: string, input: PublishErrand, idempotencyKey: string) =>
    api<Errand>(`/errands/${id}/publish`, {
      method: 'POST',
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  offers: (id: string, sort: OfferSort) =>
    api<ErrandOffer[]>(`/errands/${id}/offers`, { query: { sort } }),
  timeline: (assignmentId: string) =>
    api<ExecutionEvent[]>(`/assignments/${assignmentId}/timeline`),
  selectRunner: (errandId: string, offer: ErrandOffer, idempotencyKey: string) =>
    api<components['schemas']['AssignmentDto']>(`/errands/${errandId}/select-runner`, {
      method: 'POST',
      body: { offerId: offer.id, expectedOfferVersion: offer.version },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  extend: (id: string) => api<Errand>(`/errands/${id}/extend`, { method: 'POST', body: {} }),
  duplicate: (id: string) => api<Errand>(`/errands/${id}/duplicate`, { method: 'POST', body: {} }),
  cancel: (id: string, input: CancelErrand) =>
    api<Errand>(`/errands/${id}/cancel`, { method: 'POST', body: input }),
};
