'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import type { Me } from '@/lib/api/types';
import { clearQueryCache } from '@/lib/query/provider';

interface SessionContextValue {
  me: Me;
  signOut: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children, me }: { children: React.ReactNode; me: Me }) {
  const router = useRouter();

  const signOut = React.useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout is idempotent on the server; clear locally either way.
    }
    clearQueryCache();
    try {
      sessionStorage.clear();
    } catch {
      // Storage can be blocked.
    }
    router.replace('/login');
    router.refresh();
  }, [router]);

  const value = React.useMemo(() => ({ me, signOut }), [me, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = React.useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
