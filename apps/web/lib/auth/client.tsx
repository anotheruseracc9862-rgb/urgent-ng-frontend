'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import type { Me } from '@/lib/api/types';
import { clearQueryCache, setCurrentSessionUserId } from '@/lib/query/provider';
import { clearPendingIdentity } from '@/lib/auth/pending-identity';
import { queryKeys } from '@/lib/query/keys';
import { toast } from 'sonner';

const WEB_PUSH_DEVICE_ID = 'urgent.web-push-device-id';

interface SessionContextValue {
  me: Me;
  user: Me;
  status: Me['status'];
  startMode: Me['startMode'];
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children, me }: { children: React.ReactNode; me: Me }) {
  const router = useRouter();
  const session = useQuery({
    queryKey: queryKeys.auth.me(me.id),
    queryFn: authApi.me,
    initialData: me,
    staleTime: 15 * 60 * 1000,
  });
  React.useEffect(() => {
    setCurrentSessionUserId(me.id);
  }, [me.id]);

  const signOut = React.useCallback(async () => {
    try {
      const deviceId = localStorage.getItem(WEB_PUSH_DEVICE_ID);
      if (deviceId) {
        await authApi.removeDevice(deviceId);
        localStorage.removeItem(WEB_PUSH_DEVICE_ID);
      }
    } catch (error) {
      toast.error('This browser could not be removed from push notifications before signing out.');
    }
    try {
      await authApi.logout();
    } catch {
      // Logout is idempotent on the server; clear locally either way.
    }
    clearQueryCache();
    setCurrentSessionUserId(null);
    try {
      clearPendingIdentity();
      sessionStorage.clear();
    } catch {
      // Storage can be blocked.
    }
    router.replace('/login');
    router.refresh();
  }, [router]);

  const user = session.data ?? me;
  const value = React.useMemo(
    () => ({
      me: user,
      user,
      status: user.status,
      startMode: user.startMode,
      isLoading: session.isPending,
      signOut,
    }),
    [session.isPending, signOut, user],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** The session when there is one, or undefined. For code that can do without it. */
export function useOptionalSession() {
  return React.useContext(SessionContext);
}

export function useSession() {
  const context = React.useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
