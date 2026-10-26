import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/**
 * One action on an assignment: a full-width row with the icon on the left, so a list of them scans
 * top to bottom. Use `danger` for the one action that ends the assignment.
 */
export function ActionRow({ href, icon: Icon, children, badge, badgeTone = 'amber', danger = false }: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  /** A short marker on the right, such as "Needs you". */
  badge?: string | null;
  badgeTone?: 'amber' | 'muted';
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 motion-reduce:transition-none ${danger ? 'bg-red-bg text-red hover:opacity-80' : 'bg-panel text-ink hover:bg-tint-2'}`}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${badgeTone === 'amber' ? 'bg-amber-bg text-amber' : 'bg-surface text-muted'}`}>{badge}</span> : null}
    </Link>
  );
}
