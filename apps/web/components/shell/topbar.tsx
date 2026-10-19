'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Search, Settings, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
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
import { useHydrated } from '@/lib/use-hydrated';
import { useModeSwitch } from './use-mode-switch';
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
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const { me, signOut } = useSession();
  const unread = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => api<{ count: number }>('/notifications/unread-count'),
    staleTime: 30_000,
  });
  const notificationPreview = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => api<components['schemas']['NotificationDto'][]>('/notifications', { query: { limit: 3 } }),
    staleTime: 30_000,
  });
  const crumb = titleForPath(pathname);
  const isSettingsSubpage = pathname.startsWith('/settings/');
  const isProfileSubpage = pathname.startsWith('/profile/');
  const isMarketplaceDetail = pathname.startsWith('/marketplace/') && crumb === 'Errand details';
  const isOfferDetail = pathname.startsWith('/offers/') && crumb === 'Offer details';

  const { requestSwitch: switchMode, dialog: modeDialog } = useModeSwitch(mode);

  return (
    <div className="grid min-w-0 gap-2">
      {modeDialog}
      <header className="flex min-w-0 items-center gap-2 rounded-full bg-surface p-1.5 pl-2 shadow-[var(--shadow)] sm:gap-3 sm:p-2 sm:pl-3 lg:pl-[18px]">
      <Link href="/dashboard" className="shrink-0 lg:hidden">
        <Image src="/assets/logo.png" alt="Urgent.ng" width={80} height={20} className="h-5 w-auto sm:h-6" />
      </Link>

      {crumb ? (
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 truncate text-[12.5px] font-semibold text-muted sm:flex">
          <span>{mode === 'RUNNER' ? 'Runner' : 'Requester'}</span>
          <span aria-hidden="true">›</span>
          {isSettingsSubpage || isProfileSubpage || isMarketplaceDetail || isOfferDetail ? <>
            <Link href={isSettingsSubpage ? '/settings' : isMarketplaceDetail ? '/marketplace' : isOfferDetail ? mode === 'RUNNER' ? '/offers' : '/errands' : '/profile'} className="shrink-0 hover:text-ink">
              {isSettingsSubpage ? 'Settings' : isMarketplaceDetail ? 'Find errands' : isOfferDetail ? mode === 'RUNNER' ? 'My offers' : 'My errands' : 'Profile & account'}
            </Link>
            <span aria-hidden="true">›</span>
          </> : null}
          <span aria-current="page" className="truncate text-ink">{crumb}</span>
        </nav>
      ) : null}

      <form action={mode === 'RUNNER' ? '/marketplace' : '/errands'} role="search" className="ml-auto hidden min-w-32 max-w-[310px] flex-1 items-center gap-2 rounded-full bg-panel px-3 sm:flex">
        <Search aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <input
          type="search"
          name="q"
          aria-label={mode === 'RUNNER' ? 'Search marketplace errands' : 'Search my errands'}
          placeholder={mode === 'RUNNER' ? 'Search errands…' : 'Search my errands…'}
          className="h-10 min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
        />
      </form>
      <details className="group relative sm:hidden">
        <summary aria-label="Search" className="grid size-9 cursor-pointer list-none place-items-center rounded-full bg-panel text-ink-2 marker:hidden">
          <Search className="size-4" />
        </summary>
        <form action={mode === 'RUNNER' ? '/marketplace' : '/errands'} role="search" className="absolute right-0 top-12 z-30 w-[min(320px,calc(100vw-24px))] rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow)]">
          <input
            type="search"
            name="q"
            aria-label={mode === 'RUNNER' ? 'Search marketplace errands' : 'Search my errands'}
            placeholder={mode === 'RUNNER' ? 'Search errands…' : 'Search my errands…'}
            className="h-10 w-full rounded-full bg-panel px-4 text-xs text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-lime-600"
          />
        </form>
      </details>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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

        <details className="group relative">
          <summary
            aria-label={hydrated && unread.data?.count ? `Notifications, ${unread.data.count} unread` : 'Notifications'}
            className="relative grid size-9 cursor-pointer list-none place-items-center rounded-full bg-panel text-ink-2 transition-colors hover:bg-tint-2 marker:hidden sm:size-[42px]"
          >
            <Bell className="size-5" />
            {hydrated && unread.data && unread.data.count > 0 ? (
              <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-surface bg-[#ff5a36] px-1 text-center text-[9px] font-extrabold leading-4 text-white">
                {unread.data.count > 99 ? '99+' : unread.data.count}
              </span>
            ) : null}
          </summary>
          <div className="absolute right-0 top-12 z-30 hidden w-[min(320px,calc(100vw-24px))] rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)] group-open:block">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-ink">Notifications</strong>
              <span className="text-xs text-muted">{hydrated ? unread.data?.count ?? 0 : 0} unread</span>
            </div>
            {!hydrated || notificationPreview.isPending ? <p className="mt-2 text-xs text-muted">Loading notifications…</p> : notificationPreview.error ? (
              <p role="status" className="mt-2 text-xs text-muted">Notifications are unavailable right now. Open the notifications page to try again.</p>
            ) : notificationPreview.data?.length ? (
              <ul className="mt-3 grid gap-3">
                {notificationPreview.data.map((notification) => (
                  <li key={notification.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                    <strong className="block text-xs text-ink">{notification.title}</strong>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{notification.body}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-xs text-muted">You are all caught up.</p>}
            <Link href="/notifications" className="mt-3 inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-xs font-bold text-white hover:bg-[#0f1822]">View notifications</Link>
          </div>
        </details>

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
      {crumb ? (
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 truncate px-3 text-xs font-semibold text-muted sm:hidden">
          <span>{mode === 'RUNNER' ? 'Runner' : 'Requester'}</span>
          <span aria-hidden="true">›</span>
          {isSettingsSubpage || isProfileSubpage || isMarketplaceDetail || isOfferDetail ? <>
            <Link href={isSettingsSubpage ? '/settings' : isMarketplaceDetail ? '/marketplace' : isOfferDetail ? mode === 'RUNNER' ? '/offers' : '/errands' : '/profile'} className="shrink-0 hover:text-ink">
              {isSettingsSubpage ? 'Settings' : isMarketplaceDetail ? 'Find errands' : isOfferDetail ? mode === 'RUNNER' ? 'My offers' : 'My errands' : 'Profile & account'}
            </Link>
            <span aria-hidden="true">›</span>
          </> : null}
          <span aria-current="page" className="truncate text-ink">{crumb}</span>
        </nav>
      ) : null}
    </div>
  );
}
