import { api, apiResponse } from './client';
import type { components } from '@urgent/api-client';
import type {
  ConsentHistory,
  ConsentInput,
  BlockedUser,
  AccountChange,
  EnforcementAction,
  ReliabilityExplanation,
  PublicProfile,
  ProfileRating,
  CreateReport,
  GoogleLoginResult,
  LoginResult,
  LoginSession,
  Me,
  PolicyVersion,
  RegisteredDevice,
  RegisterResult,
} from './types';

/** Proof for a sensitive change: the password, or a fresh Google ID token for an account without one. */
export type ContactProof = { currentPassword: string } | { googleIdToken: string };

/** The backend wants exactly one of phone or email. */
export type Identifier = { phone: string } | { email: string };

export function toIdentifier(raw: string): Identifier {
  const value = raw.trim();
  return value.includes('@') ? { email: value.toLowerCase() } : { phone: value };
}

export const authApi = {
  policies: () => api<PolicyVersion[]>('/reference/policies'),
  register: (input: Identifier & { name: string; password: string; consents: ConsentInput[]; homeArea?: string }) =>
    api<RegisterResult>('/auth/register', { method: 'POST', body: input }),
  verifyOtp: (input: Identifier & { code: string }) =>
    api<{ verified: boolean }>('/auth/otp/verify', { method: 'POST', body: input }),
  resendOtp: (input: Identifier) => api<{ sent: boolean }>('/auth/otp/resend', { method: 'POST', body: input }),
  login: (input: Identifier & { password: string }) =>
    api<LoginResult>('/auth/login', { method: 'POST', body: input }),
  google: (input: { idToken: string; consents?: ConsentInput[]; homeArea?: string }) =>
    api<GoogleLoginResult>('/auth/google', { method: 'POST', body: input }),
  logout: () => api<{ loggedOut: boolean }>('/auth/logout', { method: 'POST', body: {}, noRefresh: true }),
  forgot: (input: Identifier) => api<{ sent: boolean }>('/auth/password/forgot', { method: 'POST', body: input }),
  reset: (input: Identifier & { code: string; newPassword: string }) =>
    api<{ reset: boolean }>('/auth/password/reset', { method: 'POST', body: input }),
  me: () => api<Me>('/me'),
  publicViewer: () => api<Me>('/me', { optionalAuth: true }),
  updateMe: (input: components['schemas']['UpdateMeDto']) =>
    api<Me>('/me', { method: 'PATCH', body: input }),
  setProfilePhoto: (mediaId: string) =>
    api<Me>('/me/photo', { method: 'PUT', body: { mediaId } }),
  clearProfilePhoto: () => api<Me>('/me/photo', { method: 'DELETE' }),
  summary: () => api<components['schemas']['MeSummaryDto']>('/me/summary'),
  /** Step 1 of adding or changing a phone or email: proof of the person, code sent to the new value. */
  requestContact: (input: ContactProof & Identifier) =>
    api<{ sentTo: string }>('/me/contact', { method: 'POST', body: input }),
  verifyContact: (input: Identifier & { code: string }) =>
    api<{ kind: 'phone' | 'email'; value: string }>('/me/contact/verify', { method: 'POST', body: input }),
  consents: () => api<ConsentHistory>('/me/consents'),
  acceptConsent: (input: ConsentInput) =>
    api<components['schemas']['ConsentViewDto']>('/me/consents', { method: 'POST', body: input }),
  withdrawConsent: (consentId: string) =>
    api<void>(`/me/consents/${consentId}/withdraw`, { method: 'POST' }),
  sessions: () => api<LoginSession[]>('/me/sessions'),
  revokeSession: (sessionId: string) => api<void>(`/me/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
  devices: () => api<RegisteredDevice[]>('/me/devices'),
  removeDevice: (deviceId: string) => api<void>(`/me/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' }),
  blockedUsers: () => api<BlockedUser[]>('/me/blocks'),
  blockUser: (userId: string) => api<void>(`/users/${encodeURIComponent(userId)}/block`, { method: 'POST' }),
  unblockUser: (userId: string) => api<void>(`/users/${encodeURIComponent(userId)}/block`, { method: 'DELETE' }),
  deactivate: (reason?: string) =>
    api<AccountChange>('/me/deactivate', { method: 'POST', body: { reason } }),
  reactivate: () => api<AccountChange>('/me/reactivate', { method: 'POST', body: {} }),
  requestDeletion: (reason?: string) =>
    api<AccountChange>('/me/delete-request', { method: 'POST', body: { reason } }),
  cancelDeletion: () => api<AccountChange>('/me/delete-request', { method: 'DELETE' }),
  enforcement: () => api<EnforcementAction[]>('/me/enforcement'),
  appeal: (actionId: string, note: string) =>
    api<EnforcementAction>(`/enforcement/${encodeURIComponent(actionId)}/appeal`, { method: 'POST', body: { note } }),
  reliability: () => api<ReliabilityExplanation>('/me/reliability'),
  publicProfile: (userId: string) => api<PublicProfile>(`/users/${encodeURIComponent(userId)}`),
  profileRatings: (userId: string, cursor?: string, limit = 10) =>
    api<ProfileRating[]>(`/users/${encodeURIComponent(userId)}/ratings`, { query: { cursor, limit } }),
  profileRatingsPage: (userId: string, cursor?: string, limit = 10) =>
    apiResponse<ProfileRating[]>(`/users/${encodeURIComponent(userId)}/ratings`, { query: { cursor, limit } }),
  createReport: (input: CreateReport, idempotencyKey: string) =>
    api<components['schemas']['ReportDto']>('/reports', { method: 'POST', body: input, headers: { 'Idempotency-Key': idempotencyKey } }),
};
