'use client';

import * as React from 'react';
import { Skeleton } from '@urgent/ui';
import { useHydrated } from '@/lib/use-hydrated';

/**
 * Signed-in pages are driven by queries on the client, and the browser keeps a warm query cache
 * between visits. Server HTML for such a page (a loading state) then disagrees with the first
 * client render (real data) and React throws a hydration error. Rendering the page body only
 * after hydration removes that whole class of mismatch; the shell around it still renders on the
 * server, and the body shows a skeleton until then.
 */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div aria-busy="true" aria-label="Loading page" className="grid content-start gap-4">
        <Skeleton className="h-16 rounded-[var(--r)]" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-[var(--r-lg)]" />)}
        </div>
        <Skeleton className="h-64 rounded-[var(--r-lg)]" />
      </div>
    );
  }
  return <>{children}</>;
}
