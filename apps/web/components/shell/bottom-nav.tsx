'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@urgent/ui';
import { hrefFor, isItemActive, primaryItemsFor, type ShellMode } from './nav-items';

/** Mobile bottom navigation (F0-07). Shown below the `lg` breakpoint. */
export function BottomNav({ mode }: { mode: ShellMode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const items = primaryItemsFor(mode);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const { label, icon: Icon } = item;
          const active = isItemActive(item, pathname, search);
          return (
            <li key={hrefFor(item)}>
              <Link
                href={hrefFor(item)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-bold',
                  active ? 'text-ink' : 'text-muted',
                )}
              >
                <Icon className={cn('size-5', active && 'text-green')} />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
