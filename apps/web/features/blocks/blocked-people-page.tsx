'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRoundX } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import type { BlockedUser } from '@/lib/api/types';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { invalidateBlockRelatedQueries } from './block-user-button';

function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const forbidden = isApiError(error) && error.status === 403;
  return (
    <Alert variant="danger" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p>{forbidden ? 'You do not have permission to view blocked people.' : 'We could not load or update your blocked people.'}</p>
          {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    </Alert>
  );
}

function BlockedPersonRow({ person, busy, onUnblock }: {
  person: BlockedUser;
  busy: boolean;
  onUnblock: (userId: string) => void;
}) {
  const initials = `${person.firstName.charAt(0)}${person.lastInitial}`.toUpperCase();
  return (
    <li className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center">
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-tint text-sm font-extrabold text-green-900">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-extrabold text-ink">{person.firstName} {person.lastInitial}.</h2>
        <p className="mt-1 text-xs text-muted">Blocked {formatDate(person.blockedAt, 'short')}</p>
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onUnblock(person.userId)}>
        {busy ? 'Unblocking…' : 'Unblock'}
      </Button>
    </li>
  );
}

export function BlockedPeoplePage() {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.blocks.list(me.id);
  const blockedUsers = useQuery({ queryKey, queryFn: authApi.blockedUsers });
  const unblock = useMutation({
    mutationFn: authApi.unblockUser,
    onSuccess: () => invalidateBlockRelatedQueries(queryClient, me.id),
  });

  if (blockedUsers.isLoading) {
    return (
      <div className="mx-auto grid max-w-3xl gap-5">
        <header><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-8 w-56" /><Skeleton className="mt-2 h-4 w-full max-w-xl" /></header>
        <Skeleton className="h-56 rounded-[var(--r-lg)]" />
      </div>
    );
  }

  if (blockedUsers.error || !blockedUsers.data) {
    return (
      <div className="mx-auto grid max-w-3xl gap-4">
        <h1 className="text-2xl font-extrabold text-ink">Blocked people</h1>
        <ErrorPanel error={blockedUsers.error} onRetry={() => { unblock.reset(); void blockedUsers.refetch(); }} />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Privacy &amp; safety</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Blocked people</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">Blocked people cannot offer on your errands, and you will not see theirs. Existing chats become read-only.</p>
      </header>

      {unblock.error ? <ErrorPanel error={unblock.error} onRetry={() => { unblock.reset(); void blockedUsers.refetch(); }} /> : null}

      <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5" aria-label="Blocked people list">
        {!blockedUsers.data.length ? (
          <div className="grid justify-items-center gap-3 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-panel text-muted">
              <UserRoundX className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-ink">No blocked people</h2>
              <p className="mt-1 text-xs text-muted">People you block from their profile will appear here.</p>
            </div>
          </div>
        ) : (
          <ul aria-label="Blocked people">
            {blockedUsers.data.map((person) => (
              <BlockedPersonRow key={person.userId} person={person} busy={unblock.isPending} onUnblock={(id) => unblock.mutate(id)} />
            ))}
          </ul>
        )}
      </section>

      <Alert variant="info">
        <p>Blocking does not cancel an errand already in progress. Cancel it first if you need to.</p>
      </Alert>
    </div>
  );
}
