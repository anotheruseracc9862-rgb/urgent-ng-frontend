import { api } from './client';
import type {
  ConsentHistory,
  ConsentInput,
  GoogleLoginResult,
  LoginResult,
  Me,
  PolicyVersion,
  RegisterResult,
  StartMode,
} from './types';

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
  updateMe: (input: { name?: string; startMode?: StartMode; bio?: string | null; homeArea?: string | null }) =>
    api<Me>('/me', { method: 'PATCH', body: input }),
  consents: () => api<ConsentHistory>('/me/consents'),
  acceptConsent: (input: ConsentInput) => api('/me/consents', { method: 'POST', body: input }),
};
