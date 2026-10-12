'use client';

import * as React from 'react';
import { Session } from './session';

interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
}

const SessionContext = React.createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({
  children,
  session: initialSession,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const [session, setSession] = React.useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <SessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = React.useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
