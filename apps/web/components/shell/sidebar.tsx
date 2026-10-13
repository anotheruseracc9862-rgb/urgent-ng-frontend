'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { cn } from '@urgent/ui';
import { isActive, itemsFor, type ShellMode } from './nav-items';

export function Sidebar({ mode }: { mode: ShellMode }) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Main"
      className="sticky top-4 hidden h-[calc(100vh-32px)] flex-col overflow-y-auto rounded-[var(--r-xl)] bg-surface p-[18px_14px_14px] shadow-[var(--shadow)] lg:flex"
    >
      <Link href="/dashboard" className="px-2 pb-[18px]">
        <Image src="/assets/logo.png" alt="Urgent.ng" width={130} height={32} className="h-8 w-auto" priority />
      </Link>

      {mode === 'REQUESTER' && (
        <Link
          href="/errands/new"
          className="mx-1.5 mb-[18px] flex items-center justify-center gap-2 rounded-full bg-ink px-3.5 py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#0f1822]"
        >
          <Plus className="size-4 text-lime" />
          New errand
        </Link>
      )}

      <nav className="grid gap-0.5">
        {itemsFor(mode).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-full px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-panel',
              )}
            >
              <Icon className={cn('size-5 shrink-0', active ? 'text-lime' : 'text-muted')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
