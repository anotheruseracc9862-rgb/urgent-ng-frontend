'use client';

import { useCallback, useEffect, useState } from 'react';
import { authApi } from '@/lib/api/auth';
import type { Me } from '@/lib/api/types';
import { clearSessionCaches } from '@/lib/auth/session-events';
import { clearPendingIdentity } from '@/lib/auth/pending-identity';

export type ViewerState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'user'; me: Me };

/**
 * Who is looking at a public page. Public pages stay static, so this asks `GET /me` after
 * hydration (the access cookie is HttpOnly and cannot be read here). One failed call means guest.
 */
export function useViewer() {
  const [viewer, setViewer] = useState<ViewerState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    authApi
      .publicViewer()
      .then((me) => {
        if (!cancelled) setViewer({ status: 'user', me });
      })
      .catch(() => {
        if (!cancelled) setViewer({ status: 'guest' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout is idempotent on the server.
    }
    clearSessionCaches();
    try {
      clearPendingIdentity();
      sessionStorage.clear();
    } catch {
      // Storage can be blocked.
    }
    setViewer({ status: 'guest' });
  }, []);

  return { viewer, signOut };
}
