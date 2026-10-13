export type UserStatus = 'ACTIVE' | 'DEACTIVATED' | 'SUSPENDED' | 'DELETION_PENDING' | 'DELETED';
export type StartMode = 'REQUESTER' | 'RUNNER';
export type ConsentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'SAFETY_POLICY'
  | 'PROHIBITED_ITEMS_POLICY'
  | 'OFFLINE_PAYMENT_TERMS'
  | 'LOCATION_SHARING'
  | 'MARKETING_COMMUNICATIONS';

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
  status: UserStatus;
  startMode: StartMode | null;
  photoMediaId: string | null;
  bio: string | null;
  homeArea: string | null;
  deletionScheduledAt: string | null;
  createdAt: string;
}

export interface PolicyVersion {
  id: string;
  type: ConsentType;
  version: string;
  documentRef: string;
  publishedAt: string;
  requiresReacceptance: boolean;
}

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

export interface ConsentInput {
  type: ConsentType;
  version: string;
}

export interface ConsentHistory {
  consents: { id: string; type: ConsentType; version: string; acceptedAt: string; withdrawnAt: string | null }[];
  outstanding: PolicyVersion[];
}
