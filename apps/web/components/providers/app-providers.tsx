'use client';

import type { ReactNode } from 'react';
import { TooltipProvider } from '@urgent/ui';
import { PolicyAcceptanceNavigation } from '@/lib/auth/policy-navigation';
import { QueryProvider } from '@/lib/query/provider';
import { SonnerToaster } from '@/providers/sonner-provider';

/** Client providers for everything that is not a public marketing page: query cache, tooltips, toasts. */
export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TooltipProvider>
        <PolicyAcceptanceNavigation />
        {children}
        <SonnerToaster />
      </TooltipProvider>
    </QueryProvider>
  );
}
