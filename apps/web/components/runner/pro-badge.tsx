'use client';

import { Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@urgent/ui';
import { useSession } from '@/lib/auth/client';
import { runnerQueries } from '@/features/runner/queries';

/** The Runner Pro mark. Shown wherever the backend says a runner has Pro. */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      aria-label="Runner Pro"
      className={cn('inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-lime', className)}
    >
      <Zap aria-hidden="true" className="size-3" />
      Pro
    </span>
  );
}

/** Whether a badge key from the backend is the Pro badge. */
export function isProBadge(badge: string): boolean {
  return badge.toUpperCase() === 'PRO';
}

/** The signed-in runner's own Pro state (the offer allowance already knows it). Pass false for requesters. */
export function useIsPro(enabled: boolean): boolean {
  const { me } = useSession();
  const limit = useQuery({ ...runnerQueries.offerLimit(me.id), enabled });
  return enabled && limit.data?.isPro === true;
}
