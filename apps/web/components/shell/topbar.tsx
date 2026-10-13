'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { titleForPath, type ShellMode } from './nav-items';

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
  const unread = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => api<{ count: number }>('/notifications/unread-count'),
    staleTime: 30_000,
  });
  const crumb = titleForPath(pathname);

  const switchMode = (next: ShellMode) => {
    if (next === mode) return;
    saveMode(next);
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <header className="flex min-w-0 items-center gap-2 rounded-full bg-surface p-1.5 pl-2 shadow-[var(--shadow)] sm:gap-3 sm:p-2 sm:pl-3 lg:pl-[18px]">
      <Link href="/dashboard" className="shrink-0 lg:hidden">
        <Image src="/assets/logo.png" alt="Urgent.ng" width={80} height={20} className="h-5 w-auto sm:h-6" />
      </Link>

      {crumb ? (
        <div className="hidden min-w-0 items-center gap-2 truncate text-[12.5px] font-semibold text-muted lg:flex">
          <span>{mode === 'RUNNER' ? 'Runner' : 'Requester'}</span>
          <span aria-hidden="true">›</span>
          <span className="truncate text-ink">{crumb}</span>
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <div role="group" aria-label="Mode" className="inline-flex rounded-full bg-panel p-0.5 sm:p-1">
          {MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => switchMode(value)}
              className={cn(
                'rounded-full px-2 py-1.5 text-[11px] font-bold transition-colors sm:px-3.5 sm:py-2 sm:text-[12.5px]',
                mode === value ? 'bg-ink text-white' : 'text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Link
          href="/notifications"
          aria-label={unread.data?.count ? `Notifications, ${unread.data.count} unread` : 'Notifications'}
          className="relative grid size-9 shrink-0 place-items-center rounded-full bg-panel text-ink-2 transition-colors hover:bg-tint-2 sm:size-[42px]"
        >
          <Bell className="size-5" />
          {unread.data && unread.data.count > 0 ? (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-surface bg-[#ff5a36]"
            />
          ) : null}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Account menu" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600">
            <Avatar size="sm" className="sm:size-10 sm:text-[13px]" variant="default" initials={initialsOf(me.name)} />
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
