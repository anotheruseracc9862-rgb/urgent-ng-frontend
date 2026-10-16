'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LoadingFrame } from '@/components/shell/loading-frame';
import { PolicyAcceptanceNavigation } from '@/lib/auth/policy-navigation';

/**
 * Static public pages run no query cache, tooltip or toast code. Their JavaScript is loaded
 * only for the other routes, through a dynamic import, which keeps the landing page light (F1-01).
 */
const PUBLIC_PATHS = new Set(['/', '/help', '/pricing', '/terms', '/privacy', '/link-expired']);

// While the app's providers load, show the same full-screen mascot as app/loading.tsx, so the two read as one screen.
const AppProviders = dynamic(() => import('./app-providers'), { loading: () => <LoadingFrame /> });

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
