import type { components } from '@urgent/api-client';

export type UserStatus = 'ACTIVE' | 'DEACTIVATED' | 'SUSPENDED' | 'DELETION_PENDING' | 'DELETED';
export type StartMode = 'REQUESTER' | 'RUNNER';
export type ConsentType = components['schemas']['ConsentType'];

/** Policies a new account must accept (backend `REQUIRED_CONSENTS`). */
export const REQUIRED_CONSENTS: ConsentType[] = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'SAFETY_POLICY',
  'PROHIBITED_ITEMS_POLICY',
  'OFFLINE_PAYMENT_TERMS',
];

export interface Me {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  /** False for a Google-created account without a password: confirm sensitive changes with Google. */
  hasPassword: boolean;
  googleLinked: boolean;
  status: UserStatus;
  startMode: StartMode | null;
  photoMediaId: string | null;
  bio: string | null;
  homeArea: string | null;
  deletionScheduledAt: string | null;
  createdAt: string;
}

export type PolicyVersion = components['schemas']['PolicyVersionDto'];
export type Category = components['schemas']['CategoryDto'];
export type ProhibitedItem = components['schemas']['ProhibitedItemDto'];
export type ParticipantLocation = components['schemas']['ParticipantLocationDto'];
export type ErrandContactView = components['schemas']['ErrandContactViewDto'];
export type LoginSession = components['schemas']['SessionDto'];
export type RegisteredDevice = components['schemas']['DeviceViewDto'];
export type BlockedUser = components['schemas']['BlockedUserDto'];
export type AccountChange = components['schemas']['AccountChangeDto'];
export type EnforcementAction = components['schemas']['EnforcementActionDto'];
export type ReliabilityExplanation = components['schemas']['ReliabilityExplanationDto'];
export type PublicProfile = components['schemas']['PublicProfileDto'];
export type ProfileRating = components['schemas']['ProfileRatingDto'];
export type CreateReport = components['schemas']['CreateReportDto'];

export interface LoginResult {
  userId: string;
  status: UserStatus;
  expiresIn: number;
}

export interface GoogleLoginResult extends LoginResult {
  isNewAccount: boolean;
}

export interface RegisterResult {
  userId: string;
  verifyVia: 'phone' | 'email';
  otpSent: boolean;
}

export type ConsentInput = components['schemas']['AcceptConsentDto'];

export type ConsentHistory = components['schemas']['ConsentHistoryDto'];
