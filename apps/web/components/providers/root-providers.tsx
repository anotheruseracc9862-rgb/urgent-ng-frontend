'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PolicyAcceptanceNavigation } from '@/lib/auth/policy-navigation';

/**
 * Static public pages run no query cache, tooltip or toast code. Their JavaScript is loaded
 * only for the other routes, through a dynamic import, which keeps the landing page light (F1-01).
 */
const PUBLIC_PATHS = new Set(['/', '/help', '/pricing', '/terms', '/privacy', '/link-expired']);

const AppProviders = dynamic(() => import('./app-providers'));

export function RootProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_PATHS.has(pathname)) {
    return (
      <>
        <PolicyAcceptanceNavigation />
        {children}
      </>
    );
  }

  return <AppProviders>{children}</AppProviders>;
}
