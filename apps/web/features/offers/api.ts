import type { components } from '@urgent/api-client';
import { api, apiResponse } from '@/lib/api/client';

export type OfferNegotiation = components['schemas']['OfferNegotiationDto'];
export type NegotiationEvent = components['schemas']['NegotiationEventDto'];
export type RunnerOffer = components['schemas']['RunnerOfferSummaryDto'];
export type RequesterOffer = components['schemas']['RequesterOfferSummaryDto'];
export type RunnerOfferLimit = components['schemas']['RunnerOfferLimitDto'];
export type RunnerEligibility = components['schemas']['RunnerEligibilityDto'];
export type MarketplaceErrand = components['schemas']['MarketplaceErrandDto'];
export type AssignmentDetail = components['schemas']['AssignmentDetailDto'];
export type OfferTerms = components['schemas']['CounterOfferDto'];
export type RunnerAssignmentSummary = components['schemas']['RunnerAssignmentSummaryDto'];
export type HistorySummary = components['schemas']['HistorySummaryDto'];
export type RunnerPerformance = components['schemas']['RunnerPerformanceDto'];
export type ExecutionEvent = components['schemas']['ExecutionEventDto'];
export type ExecutionStep = components['schemas']['ExecutionStepDto'];
export type StepEvidence = components['schemas']['StepEvidenceDto'];
export type ExecutionProblem = components['schemas']['ProblemDto'];
export type LiveLocation = components['schemas']['LiveLocationDto'];
export type ChangeRequest = components['schemas']['ChangeRequestDto'];
export type PaymentAgreement = components['schemas']['PaymentAgreementDto'];
export type NoShowState = components['schemas']['NoShowStateDto'];
export type NoShowReport = components['schemas']['NoShowReportDto'];

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
  requesterOffers: (filters: { status?: RequesterOffer['status']; cursor?: string; limit?: number }) =>
    apiResponse<RequesterOffer[]>('/requester/offers', { query: filters }),
  marketplaceErrand: (id: string) => api<MarketplaceErrand>(`/marketplace/errands/${id}`),
  runnerAssignments: (filters: { cursor?: string; limit?: number; status?: string; q?: string; from?: string; to?: string }) =>
    apiResponse<RunnerAssignmentSummary>('/runner/assignments', { query: filters }),
  runnerHistorySummary: (months = 6) =>
    api<HistorySummary>('/runner/assignments/summary', { query: { months } }),
  runnerPerformance: () => api<RunnerPerformance>('/runner/performance'),
  assignment: (id: string) => apiResponse<AssignmentDetail>(`/assignments/${id}`),
  assignmentTimeline: (id: string) => api<ExecutionEvent[]>(`/assignments/${id}/timeline`),
  executionStep: (id: string, step: 'start' | 'pickup' | 'deliver', idempotencyKey: string, input?: StepEvidence) =>
    api<ExecutionStep>(`/assignments/${id}/${step}`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      ...(input ? { body: input } : {}),
    }),
  arrived: (id: string, input: components['schemas']['ArrivedDto'], idempotencyKey: string) =>
    api<ExecutionEvent>(`/assignments/${id}/arrived`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: input,
    }),
  executionProblems: (id: string) => api<ExecutionProblem[]>(`/assignments/${id}/problems`),
  reportExecutionProblem: (id: string, input: components['schemas']['ReportProblemDto']) =>
    api<ExecutionProblem>(`/assignments/${id}/problems`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: input,
    }),
  resolveExecutionProblem: (id: string, problemId: string) =>
    api<ExecutionProblem>(`/assignments/${id}/problems/${problemId}/resolve`, { method: 'POST' }),
  delayNotice: (id: string, input: components['schemas']['DelayNoticeDto']) =>
    api<ExecutionEvent>(`/assignments/${id}/delay-notices`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: input,
    }),
  addReceipt: (id: string, input: components['schemas']['ReceiptDto']) =>
    api<ExecutionEvent>(`/assignments/${id}/receipt`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: input,
    }),
  liveLocation: (id: string) => api<LiveLocation>(`/assignments/${id}/location`),
  recordLocation: (id: string, input: components['schemas']['ReportLocationDto']) =>
    api<components['schemas']['RecordedLocationDto']>(`/assignments/${id}/location`, { method: 'POST', body: input }),
  setLocationSharing: (id: string, enabled: boolean) =>
    api<components['schemas']['SharingStateDto']>(`/assignments/${id}/location/sharing`, {
      method: 'PUT',
      body: { enabled },
    }),
  changeRequests: (id: string) => api<ChangeRequest[]>(`/assignments/${id}/change-requests`),
  createChangeRequest: (id: string, input: components['schemas']['CreateChangeRequestDto']) =>
    api<ChangeRequest>(`/assignments/${id}/change-requests`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: input,
    }),
  respondToChangeRequest: (requestId: string, action: 'accept' | 'reject' | 'cancel') =>
    api<ChangeRequest>(`/change-requests/${requestId}/${action}`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    }),
  paymentAgreement: (id: string) => api<PaymentAgreement>(`/assignments/${id}/payment-agreement`),
  updatePaymentAgreement: (id: string, input: components['schemas']['UpdatePaymentAgreementDto']) =>
    api<PaymentAgreement>(`/assignments/${id}/payment-agreement`, { method: 'PUT', body: input }),
  completeErrand: (errandId: string) =>
    api<ExecutionStep>(`/errands/${errandId}/complete`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    }),
  cancelAssignment: (id: string, input: components['schemas']['CancelAssignmentDto']) =>
    api<components['schemas']['AssignmentDto']>(`/assignments/${id}/cancel`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: input,
    }),
  noShowState: (id: string) => api<NoShowState>(`/assignments/${id}/no-show`),
  reportNoShow: (id: string, input: components['schemas']['ReportNoShowDto']) =>
    api<NoShowReport>(`/assignments/${id}/no-show`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: input,
    }),
  respondToNoShow: (id: string, response: components['schemas']['RespondNoShowDto']['response']) =>
    api<NoShowReport>(`/assignments/${id}/no-show/respond`, {
      method: 'POST',
      body: { response },
    }),
  acceptAssignment: (id: string, idempotencyKey: string) =>
    api<components['schemas']['AssignmentDto']>(`/assignments/${id}/accept`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  declineAssignment: (id: string) =>
    api<components['schemas']['AssignmentDto']>(`/assignments/${id}/decline`, { method: 'POST' }),
};
