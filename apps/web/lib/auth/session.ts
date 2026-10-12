import { cookies } from 'next/headers';
import * as jose from 'jose';

export interface SessionUser {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: 'REQUESTER' | 'RUNNER';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'DELETION_PENDING';
  startMode: 'REQUESTER' | 'RUNNER';
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  acceptedPolicyVersions: Record<string, number>;
}

export interface Session {
  user: SessionUser;
  accessToken: string;
  accessTokenExpiresAt: string;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  
  if (!accessToken) {
    return null;
  }

  try {
    // Decode without verification for now (verification happens at API level)
    const decoded = jose.decodeJwt(accessToken);
    
    return {
      user: decoded as unknown as SessionUser,
      accessToken,
      accessTokenExpiresAt: new Date((decoded.exp || 0) * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}
