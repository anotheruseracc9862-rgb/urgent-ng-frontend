'use client';

import { PageHead } from '@/components/shell/page-head';
import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/lib/query/mutations';
import { UserRoundX } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import type { BlockedUser } from '@/lib/api/types';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';

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
    <li className="flex min-w-0 flex-col gap-3 border-t border-line-2 px-1 py-4 first:border-0 sm:flex-row sm:items-center">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-tint-2 text-sm font-extrabold text-green-900">
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
  const queryKey = queryKeys.blocks.list(me.id);
  const blockedUsers = useQuery({ queryKey, queryFn: authApi.blockedUsers });
  const unblock = useApiMutation({
    mutationFn: authApi.unblockUser,
    // The person returns to the feed, offers and chats.
    affects: ['blocks'],
  });

  if (blockedUsers.isPending) {
    return (
      <div className="grid min-w-0 content-start gap-4 pb-10" aria-busy="true">
        <PageHead
          eyebrow="Settings"
          title="Blocked people"
          description="Blocked people cannot offer on your errands, and you will not see theirs. Existing chats become read-only."
        />
        <section aria-label="Loading blocked people" className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 border-t border-line-2 px-1 py-4 first:border-0">
              <Skeleton className="size-10 shrink-0 rounded-[13px]" />
              <div className="grid min-w-0 flex-1 gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48 max-w-full" />
              </div>
              <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </section>
      </div>
    );
  }

  if (blockedUsers.error || !blockedUsers.data) {
    return (
      <div className="grid min-w-0 content-start gap-4">
        <PageHead eyebrow="Settings" title="Blocked people" />
        <ErrorPanel error={blockedUsers.error} onRetry={() => { unblock.reset(); void blockedUsers.refetch(); }} />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Settings"
        title="Blocked people"
        description="Blocked people cannot offer on your errands, and you will not see theirs. Existing chats become read-only."
      />

      {unblock.error ? <ErrorPanel error={unblock.error} onRetry={() => { unblock.reset(); void blockedUsers.refetch(); }} /> : null}

      <section className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]" aria-label="Blocked people list">
        {!blockedUsers.data.length ? (
          <div className="grid justify-items-center gap-2.5 px-5 py-10 text-center" role="status">
            <span aria-hidden="true" className="grid size-14 place-items-center rounded-[18px] bg-panel text-ink-2">
              <UserRoundX className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-extrabold text-ink">No blocked people</h2>
              <p className="mt-1 text-sm text-muted">People you block from their profile will appear here.</p>
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

      <Alert variant="info" role="note">
        <p>Blocking does not cancel an errand already in progress. Cancel it first if you need to.</p>
      </Alert>
    </div>
  );
}
