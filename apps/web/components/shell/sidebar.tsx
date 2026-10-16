'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Compass, LogOut, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Switch,
} from '@urgent/ui';
import { useSession } from '@/lib/auth/client';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { runnerApi } from '@/features/runner/api';
import { runnerQueries } from '@/features/runner/queries';
import { useApiMutation } from '@/lib/query/mutations';
import { accountMenuFor, hrefFor, isItemActive, itemsFor, type NavItem, type ShellMode } from './nav-items';
import { useNavCounts, type NavCounts } from './use-nav-counts';

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
}

function NavLink({ item, active, count }: { item: NavItem; active: boolean; count: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={hrefFor(item)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-full px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
        active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-panel',
      )}
    >
      <Icon className={cn('size-5 shrink-0', active ? 'text-lime' : 'text-muted')} />
      <span>{item.label}</span>
      {count > 0 ? (
        <b
          className={cn(
            'ml-auto min-w-[22px] rounded-full px-[7px] py-px text-center text-[11px] font-extrabold',
            item.countAlert ? 'bg-[#ff7a45] text-white' : 'bg-lime text-ink',
          )}
        >
          <span className="sr-only">{item.label}: </span>
          {count > 99 ? '99+' : count}
        </b>
      ) : null}
    </Link>
  );
}

/** The online/offline switch from the demo rail. Falls back to a link when there is no runner profile. */
function AvailabilitySwitch({ userId }: { userId: string }) {
  const client = useQueryClient();
  const profile = useQuery(runnerQueries.profile(userId));
  const update = useApiMutation({
    mutationFn: (availability: 'AVAILABLE' | 'UNAVAILABLE') => runnerApi.updateAvailability(availability),
    // Eligibility, the feed and the dashboard all depend on being online.
    affects: ['runner'],
    onSuccess: (updated) => {
      client.setQueryData(runnerQueries.profile(userId).queryKey, updated);
    },
  });

  if (profile.error || (!profile.isPending && !profile.data)) {
    return (
      <Link href="/runner/profile" className="mx-1.5 mb-3 flex min-h-11 items-center gap-2.5 rounded-full bg-tint px-3.5 text-[13px] font-bold text-green-900 transition-colors hover:bg-tint-2">
        <span className="size-2 rounded-full bg-lime-600" aria-hidden="true" />
        Set up your runner profile
      </Link>
    );
  }

  if (profile.isPending && profile.fetchStatus !== 'idle') {
    return <div aria-hidden="true" className="mx-1.5 mb-3 h-[42px] animate-pulse rounded-full bg-panel" />;
  }

  const online = profile.data?.availability === 'AVAILABLE';
  return (
    <div
      className={cn(
        'mx-1.5 mb-3 flex min-h-[42px] items-center gap-2.5 rounded-full py-0 pl-3.5 pr-1 text-[13.5px] font-bold',
        online ? 'bg-tint text-green-900' : 'bg-panel text-muted',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', online ? 'bg-lime-600 shadow-[0_0_0_3px_rgba(147,199,0,0.25)]' : 'bg-faint')}
      />
      <span id="availability-label" aria-live="polite">{online ? 'You are online' : 'You are offline'}</span>
      <Switch
        className="ml-auto"
        aria-labelledby="availability-label"
        checked={online}
        disabled={update.isPending}
        onCheckedChange={(checked) => update.mutate(checked ? 'AVAILABLE' : 'UNAVAILABLE')}
      />
    </div>
  );
}

export function Sidebar({ mode, name }: { mode: ShellMode; name?: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const { me, signOut } = useSession();
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string>();
  const photo = useQuery({
    queryKey: queryKeys.media.url(me.photoMediaId ?? ''),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${me.photoMediaId}/url`),
    enabled: Boolean(me.photoMediaId),
    staleTime: 4 * 60 * 1000,
    retry: false,
  });
  const counts: NavCounts = useNavCounts(mode, me.id);
  const display = name ?? me.name;
  const items = itemsFor(mode);
  const menu = accountMenuFor(mode);

  const renderGroup = (group: NavItem[]) => group.map((item) => (
    <NavLink
      key={hrefFor(item)}
      item={item}
      active={isItemActive(item, pathname, search)}
      count={item.count ? counts[item.count] ?? 0 : 0}
    />
  ));

  return (
    <aside
      aria-label="Main"
      className="sticky top-4 hidden h-[calc(100vh-32px)] flex-col overflow-hidden rounded-[var(--r-xl)] bg-surface p-[18px_14px_14px] shadow-[var(--shadow)] lg:flex"
    >
      <Link href="/" aria-label="Urgent.ng home" className="px-2 pb-[18px]">
        <Image src="/assets/logo.png" alt="Urgent.ng" width={130} height={32} className="h-8 w-auto" priority />
      </Link>

      <Link
        href={mode === 'REQUESTER' ? '/errands/new' : '/marketplace'}
        className="mx-1.5 mb-[18px] flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-3.5 py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#0f1822]"
      >
        {mode === 'REQUESTER' ? <Plus className="size-4 text-lime" /> : <Compass className="size-4 text-lime" />}
        {mode === 'REQUESTER' ? 'Post an errand' : 'Find errands'}
      </Link>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {mode === 'RUNNER' ? <AvailabilitySwitch userId={me.id} /> : null}
        <div className="mb-1 px-3 pt-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-faint">Menu</div>
        <nav aria-label="Main" className="grid gap-0.5">
          {renderGroup(items.filter((item) => item.section !== 'account'))}
        </nav>
        <div className="mb-1 mt-5 px-3 text-[10.5px] font-bold uppercase tracking-[.12em] text-faint">Account</div>
        <nav aria-label="Account" className="grid gap-0.5">
          {renderGroup(items.filter((item) => item.section === 'account'))}
        </nav>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="group mt-2 flex w-full shrink-0 items-center gap-2.5 rounded-2xl bg-panel p-2.5 text-left transition-colors hover:bg-tint-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime-600 data-[state=open]:bg-tint-2"
        >
          <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-[11px] font-extrabold text-lime">
            {photo.data?.url && photo.data.url !== failedPhotoUrl ? (
              <Image
                src={photo.data.url}
                alt="Your profile photo"
                fill
                unoptimized
                sizes="36px"
                className="object-cover"
                onError={() => setFailedPhotoUrl(photo.data?.url)}
              />
            ) : (
              <span aria-hidden="true">{initialsOf(display)}</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold text-ink">{display}</span>
            <span className="block text-[11px] text-muted">{mode === 'RUNNER' ? 'Runner mode' : 'Requester mode'}</span>
          </span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 -rotate-90 text-muted transition-transform duration-200 group-data-[state=open]:rotate-90" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="menu-pop min-w-[240px]">
          {menu.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem key={href} onSelect={() => router.push(href)}>
              <Icon className="mr-2 size-4 text-muted" /> {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut()} className="text-red">
            <LogOut className="mr-2 size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}
