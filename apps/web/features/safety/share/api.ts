import type { components } from '@urgent/api-client';
import { formatDate } from '@urgent/utils';
import { api, isApiError } from '@/lib/api/client';

export type Share = components['schemas']['ShareDto'];
export type CreatedShare = components['schemas']['CreatedShareDto'];
export type SharedErrand = components['schemas']['SharedErrandDto'];
export const shareKeys = {
  all: ['trusted-contact'] as const,
  list: (id: string) => ['trusted-contact', 'list', id] as const,
  public: (token: string) => ['trusted-contact', 'public', token] as const,
};
const publicOptions = { optionalAuth: true, noRefresh: true, noPolicyIntercept: true } as const;
export const listShares = (id: string) => api<Share[]>(`/errands/${encodeURIComponent(id)}/trusted-contact`);
export const createShare = (id: string, key: string) => api<CreatedShare>(`/errands/${encodeURIComponent(id)}/trusted-contact`, { method: 'POST', headers: { 'Idempotency-Key': key } });
export const revokeShare = (id: string) => api<Share>(`/trusted-contact/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const getShared = (token: string, signal: AbortSignal) => api<SharedErrand>(`/shared/${encodeURIComponent(token)}`, { ...publicOptions, signal });
export const raiseConcern = (token: string, body: components['schemas']['RaiseConcernDto']) => api<components['schemas']['ConcernResultDto']>(`/shared/${encodeURIComponent(token)}/concern`, { ...publicOptions, method: 'POST', body });
export const unavailable = (error: unknown) => isApiError(error) && (error.status === 404 || error.code === 'RESOURCE_NOT_FOUND');
export function errorText(error: unknown) {
  return `Unable to complete this request. Please try again.${isApiError(error) && error.requestId ? ` Reference: ${error.requestId}` : ''}`;
}
export function dateText(value: string) {
  return Number.isFinite(Date.parse(value)) ? `${formatDate(value)} (Lagos time)` : 'Not available';
}
