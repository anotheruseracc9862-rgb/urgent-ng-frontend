'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronRight, Compass, Plus, Settings2 } from 'lucide-react';
import { cn } from '@urgent/ui';
import { isActive, itemsFor, type ShellMode } from './nav-items';

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
}

export function Sidebar({ mode, name }: { mode: ShellMode; name?: string }) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Main"
      className="sticky top-4 hidden h-[calc(100vh-32px)] flex-col overflow-hidden rounded-[var(--r-xl)] bg-surface p-[18px_14px_14px] shadow-[var(--shadow)] lg:flex"
    >
      <Link href="/dashboard" className="px-2 pb-[18px]">
        <Image src="/assets/logo.png" alt="Urgent.ng" width={130} height={32} className="h-8 w-auto" priority />
      </Link>

      <Link
        href={mode === 'REQUESTER' ? '/errands/new' : '/marketplace'}
        className="mx-1.5 mb-[18px] flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-3.5 py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#0f1822]"
      >
        {mode === 'REQUESTER' ? <Plus className="size-4 text-lime" /> : <Compass className="size-4 text-lime" />}
        {mode === 'REQUESTER' ? 'New errand' : 'Find errands'}
      </Link>

      {mode === 'RUNNER' ? (
        <Link href="/dashboard#availability" className="mx-1.5 mb-2 mt-1 flex min-h-11 items-center gap-2.5 rounded-xl bg-tint px-3.5 text-[13px] font-bold text-green-900 transition-colors hover:bg-tint-2">
          <Settings2 aria-hidden="true" className="size-4 shrink-0 text-green-800" />
          <span className="min-w-0 flex-1">Availability settings</span>
          <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-green-800" />
        </Link>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mb-1 px-3 pt-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-faint">Menu</div>
        <nav aria-label="Main" className="grid gap-0.5">
          {itemsFor(mode).filter((item) => item.section !== 'account').map(({ href, label, icon: Icon }) => {
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
        <div className="mb-1 mt-5 px-3 text-[10.5px] font-bold uppercase tracking-[.12em] text-faint">Account</div>
        <nav aria-label="Account" className="grid gap-0.5">
          {itemsFor(mode).filter((item) => item.section === 'account').map(({ href, label, icon: Icon }) => {
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
      </div>
      {name ? (
        <Link href="/profile" className="mt-2 flex shrink-0 items-center gap-2.5 rounded-2xl bg-panel p-2.5 transition-colors hover:bg-tint-2">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-extrabold text-lime">{initialsOf(name)}</span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold text-ink">{name}</span>
            <span className="block text-[11px] text-muted">{mode === 'RUNNER' ? 'Runner mode' : 'Requester mode'}</span>
          </span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 rotate-180 text-muted" />
        </Link>
      ) : null}
    </aside>
  );
}
