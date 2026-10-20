'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, cn, Switch } from '@urgent/ui';
import { useSession } from '@/lib/auth/client';
import { useApiMutation } from '@/lib/query/mutations';
import { runnerApi } from '@/features/runner/api';
import { runnerQueries } from '@/features/runner/queries';

/** The runner's online/offline state and a way to change it. Going online or offline changes what they can browse and offer on. */
export function useAvailability() {
  const { me } = useSession();
  const client = useQueryClient();
  const router = useRouter();
  const profile = useQuery(runnerQueries.profile(me.id));
  const update = useApiMutation({
    mutationFn: (availability: 'AVAILABLE' | 'UNAVAILABLE') => runnerApi.updateAvailability(availability),
    affects: ['runner'],
    onSuccess: (updated) => {
      client.setQueryData(runnerQueries.profile(me.id).queryKey, updated);
      // Pages that were gated on the server (the feed, an offer form) re-check eligibility.
      router.refresh();
    },
  });
  const known = Boolean(profile.data);
  const online = profile.data?.availability === 'AVAILABLE';
  return { known, online, pending: update.isPending, set: (next: boolean) => update.mutate(next ? 'AVAILABLE' : 'UNAVAILABLE') };
}

/** A "Go online" button for the places that tell a runner they are offline. */
export function GoOnlineButton({ className }: { className?: string }) {
  const { known, pending, set } = useAvailability();
  if (!known) return null;
  return (
    <Button type="button" className={className} disabled={pending} onClick={() => set(true)}>
      {pending ? 'Going online…' : 'Go online'}
    </Button>
  );
}

/** A compact online/offline switch for page headers. */
export function AvailabilityPill({ className }: { className?: string }) {
  const { known, online, pending, set } = useAvailability();
  if (!known) return null;
  return (
    <div className={cn('flex min-h-10 items-center gap-2.5 rounded-full py-0 pl-3.5 pr-1.5 text-[13px] font-bold', online ? 'bg-tint text-green-900' : 'bg-panel text-muted', className)}>
      <span aria-hidden="true" className={cn('size-2 rounded-full', online ? 'bg-lime-600 shadow-[0_0_0_3px_rgba(147,199,0,0.25)]' : 'bg-faint')} />
      <span id="availability-pill-label" aria-live="polite">{online ? 'Online' : 'Offline'}</span>
      <Switch className="ml-auto" aria-labelledby="availability-pill-label" checked={online} disabled={pending} onCheckedChange={set} />
    </div>
  );
}
