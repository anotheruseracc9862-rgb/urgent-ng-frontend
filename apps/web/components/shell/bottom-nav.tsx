'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { cn } from '@urgent/ui';
import { useSession } from '@/lib/auth/client';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { hrefFor, isItemActive, primaryItemsFor, type ShellMode } from './nav-items';

/** Mobile bottom navigation (F0-07). Shown below the `lg` breakpoint. */
export function BottomNav({ mode }: { mode: ShellMode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const { me } = useSession();
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string>();
  const photo = useQuery({
    queryKey: queryKeys.media.url(me.photoMediaId ?? ''),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${me.photoMediaId}/url`),
    enabled: Boolean(me.photoMediaId),
    staleTime: 4 * 60 * 1000,
    retry: false,
  });
  const initials = me.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
  const items = primaryItemsFor(mode);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const { label, icon: Icon } = item;
          const isProfile = item.href === '/profile';
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
                {isProfile ? (
                  <span aria-hidden="true" className={cn('relative grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-tint-2 text-[9px] font-extrabold text-green-900', active && 'ring-2 ring-green ring-offset-1 ring-offset-surface')}>
                    {photo.data?.url && photo.data.url !== failedPhotoUrl ? (
                      <Image
                        src={photo.data.url}
                        alt=""
                        fill
                        unoptimized
                        sizes="24px"
                        className="object-cover"
                        onError={() => setFailedPhotoUrl(photo.data?.url)}
                      />
                    ) : initials}
                  </span>
                ) : <Icon className={cn('size-5', active && 'text-green')} />}
                <span className="max-w-full truncate">{isProfile ? 'Profile' : label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
