'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@urgent/ui';
import { useSession } from '@/lib/auth/client';
import { saveMode } from '@/lib/auth/mode';
import { itemsFor, type ShellMode } from './nav-items';

const MODES: { value: ShellMode; label: string }[] = [
  { value: 'REQUESTER', label: 'Requester' },
  { value: 'RUNNER', label: 'Runner' },
];

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  );
}

export function Topbar({ mode }: { mode: ShellMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { me, signOut } = useSession();

  const crumb = itemsFor(mode).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.label;

  const switchMode = (next: ShellMode) => {
    if (next === mode) return;
    saveMode(next);
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <header className="flex items-center gap-3 rounded-full bg-surface p-2 pl-3 shadow-[var(--shadow)] lg:pl-[18px]">
      <Link href="/dashboard" className="shrink-0 lg:hidden">
        <Image src="/assets/logo.png" alt="Urgent.ng" width={96} height={24} className="h-6 w-auto" />
      </Link>

      {crumb ? (
        <div className="hidden min-w-0 truncate text-[12.5px] font-semibold text-muted lg:block">
          {crumb}
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <div role="group" aria-label="Mode" className="inline-flex rounded-full bg-panel p-1">
          {MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => switchMode(value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12.5px] font-bold transition-colors sm:px-3.5 sm:py-2',
                mode === value ? 'bg-ink text-white' : 'text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Link
          href="/notifications"
          aria-label="Notifications"
          className="grid size-[42px] place-items-center rounded-full bg-panel text-ink-2 transition-colors hover:bg-tint-2"
        >
          <Bell className="size-5" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Account menu" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600">
            <Avatar size="default" variant="default" initials={initialsOf(me.name)} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuLabel className="truncate">{me.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/profile')}>
              <User className="mr-2 size-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/settings')}>
              <Settings className="mr-2 size-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut className="mr-2 size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
