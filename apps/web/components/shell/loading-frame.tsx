'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { isProtectedPath } from '@/lib/auth/protected-paths';

/**
 * What to show while the signed-in shell is still being prepared, so the person sees the frame of
 * the app and not a blank page: the sidebar column, the top bar and an empty content area. It
 * carries no page content and no placeholder blocks. Outside the signed-in app it is a thin
 * progress bar.
 */
export function LoadingFrame() {
  const pathname = usePathname();

  if (!isProtectedPath(pathname)) {
    return (
      <div role="progressbar" aria-label="Loading" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent">
        <div className="h-full w-1/3 animate-pulse bg-lime-600" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen gap-4 p-3 sm:p-4 lg:grid-cols-[276px_minmax(0,1fr)]" aria-busy="true" aria-label="Loading">
      <aside className="sticky top-4 hidden h-[calc(100vh-32px)] flex-col rounded-[var(--r-xl)] bg-surface p-[18px_14px_14px] shadow-[var(--shadow)] lg:flex">
        <div className="px-2 pb-[18px]">
          <Image src="/assets/logo.png" alt="Urgent.ng" width={130} height={32} className="h-8 w-auto" priority />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="h-[58px] rounded-full bg-surface shadow-[var(--shadow)]" />
      </div>
    </div>
  );
}
