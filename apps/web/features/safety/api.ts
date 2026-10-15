import type { components } from '@urgent/api-client';
import type { QueryClient } from '@tanstack/react-query';
import { api, apiResponse } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { queryKeys } from '@/lib/query/keys';

export type EvidenceItem = components['schemas']['EvidenceItemDto'];
export type Evidence = components['schemas']['EvidenceDto'];
export type Dispute = components['schemas']['DisputeDto'];
export type OpenDispute = components['schemas']['OpenDisputeDto'];
export type Report = components['schemas']['ReportDto'];
export type CreateReport = components['schemas']['CreateReportDto'];

export const safetyKeys = {
  dispute: (id: string) => ['disputes', id] as const,
  reports: () => ['reports'] as const,
  report: (id: string) => ['reports', 'detail', id] as const,
};
export const safetyApi = {
  openDispute: (id: string, body: OpenDispute, key: string) => api<Dispute>(`/assignments/${id}/disputes`, { method: 'POST', body, headers: { 'Idempotency-Key': key } }),
  dispute: (id: string) => api<Dispute>(`/disputes/${id}`),
  addEvidence: (id: string, body: EvidenceItem) => api<Dispute>(`/disputes/${id}/evidence`, { method: 'POST', body }),
  createReport: (body: CreateReport, key: string) => body.targetType === 'RATING'
    ? api<Report>(`/ratings/${body.targetId}/report`, { method: 'POST', body: { type: body.type, description: body.description }, headers: { 'Idempotency-Key': key } })
    : authApi.createReport(body, key),
  reports: (cursor?: string) => apiResponse<Report[]>('/reports', { query: { cursor, limit: 20 } }),
  report: (id: string) => api<Report>(`/reports/${id}`),
};

// Cases can pause completion or change the errand's state in every cached view.
export async function refreshCaseViews(client: QueryClient) {
  await Promise.all([
    queryKeys.assignments.all(), queryKeys.errands.all(), queryKeys.marketplace.all(),
    queryKeys.runner.all(), queryKeys.offers.all(), ['dashboard'], safetyKeys.reports(),
  ].map(queryKey => client.invalidateQueries({ queryKey })));
}
