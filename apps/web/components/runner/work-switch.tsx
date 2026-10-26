'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@urgent/ui';
import { dashboardQueries } from '@/features/dashboard/queries';
import { useOptionalSession } from '@/lib/auth/client';

/**
 * Browse | My offers. On phones the bottom bar has no tab for offers, so the Find errands tab
 * covers both pages and this switch moves between them. The desktop rail has both, so it is hidden there.
 */
export function RunnerWorkSwitch({ current }: { current: 'browse' | 'offers' }) {
  const session = useOptionalSession();
  const summary = useQuery({ ...dashboardQueries.summary(session?.me.id ?? ''), enabled: Boolean(session) });
  const waiting = summary.data?.asRunner?.offersAwaitingYou ?? 0;

  const tab = (active: boolean) => cn(
    'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-bold transition-colors',
    active ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(23,33,46,.12)]' : 'text-muted hover:text-ink',
  );

  return (
    <nav aria-label="Errands and offers" className="flex gap-1 rounded-full bg-panel p-1 lg:hidden">
      <Link href="/marketplace" aria-current={current === 'browse' ? 'page' : undefined} className={tab(current === 'browse')}>
        Browse errands
      </Link>
      <Link href="/offers" aria-current={current === 'offers' ? 'page' : undefined} className={tab(current === 'offers')}>
        My offers
        {waiting > 0 ? (
          <span aria-label={`${waiting} awaiting your reply`} className="min-w-5 rounded-full bg-[#ff5a36] px-1.5 text-center text-[10.5px] font-extrabold leading-5 text-white">
            {waiting > 99 ? '99+' : waiting}
          </span>
        ) : null}
      </Link>
    </nav>
  );
}
