import { cookies } from 'next/headers';
import { api, isApiError } from '@/lib/api/client';
import type { Me } from '@/lib/api/types';

export const ACCESS_COOKIE = 'ung_at';
export const REFRESH_COOKIE = 'ung_rt';
export const MODE_COOKIE = 'ung_mode';

async function cookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

/**
 * Reads the signed-in user from `GET /me`. The access token is opaque to the web app:
 * the API is the only place that verifies it.
 */
export async function getSession(): Promise<Me | null> {
  const store = await cookies();
  if (!store.get(ACCESS_COOKIE)) return null;

  try {
    return await api<Me>('/me', { cookie: await cookieHeader() });
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

/** The mode the shell shows: the saved switch first, then the user's start mode. */
export async function getActiveMode(me: Me): Promise<'REQUESTER' | 'RUNNER'> {
  const saved = (await cookies()).get(MODE_COOKIE)?.value;
  if (saved === 'REQUESTER' || saved === 'RUNNER') return saved;
  return me.startMode ?? 'REQUESTER';
}
