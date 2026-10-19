'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { JourneyHere } from '@/features/journey/journey-context';

function countdown(deadline: string, now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(deadline) - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours}h ${minutes}m ${remainder}s`;
}

export function AssignmentCompletionPage({ assignmentId }: { assignmentId: string }) {
  const client = useQueryClient();
  const key = queryKeys.assignments.detail(assignmentId);
  const assignment = useQuery({ queryKey: key, queryFn: () => offersApi.assignment(assignmentId), retry: false });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const complete = useApiMutation({ affects: ['assignments'],
    mutationFn: () => {
      if (!assignment.data) throw new Error('Assignment details are unavailable.');
      return offersApi.completeErrand(assignment.data.data.errandId);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: queryKeys.assignments.timeline(assignmentId) }),
      ]);
    },
    onError: async (error) => {
      if (isApiError(error) && error.code === 'ERRAND_INVALID_STATE') await assignment.refetch();
    },
  });

  if (assignment.isPending) {
    return <PageLoading title="Confirm delivery" eyebrow="Assignment" width="max-w-3xl" />;
  }
  if (assignment.error || !assignment.data) {
    return (
      <main className="mx-auto max-w-3xl">
        <ApiError error={assignment.error} fallback="We could not load this assignment." onRetry={() => void assignment.refetch()} />
      </main>
    );
  }

  const current = assignment.data.data;
  const errand = current.errand;
  const canConfirm = current.role === 'REQUESTER' && current.status === 'ACCEPTED' && errand.status === 'DELIVERED';
  const deadline = errand.autoCompleteAt;
  const paused = errand.status === 'DELIVERED' && deadline === null;

  return (
    <main className="mx-auto grid max-w-3xl gap-4">
      <Link href={`/assignments/${assignmentId}`} className="w-fit text-sm font-bold text-green-800 hover:underline">← Back to assignment</Link>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Delivery confirmation</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{errand.title}</h1>
      </header>
      <JourneyHere />
      {errand.status === 'DELIVERED' ? (
        <section className="grid gap-2 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <h2 className="font-extrabold text-ink">Delivery status</h2>
          {paused ? (
            <Alert variant="warn" role="status">Automatic completion is paused while an open report or dispute is being handled.</Alert>
          ) : (
            <p className="text-sm text-ink-2">
              {deadline && Date.parse(deadline) > now
                ? `Automatic completion in ${countdown(deadline, now)}.`
                : 'The automatic completion deadline has passed. The server will update the errand status.'}
            </p>
          )}
          <p className="text-xs text-muted">Deadline from server: {deadline ? <time dateTime={deadline}>{formatDate(deadline)} (Lagos time)</time> : 'paused'}</p>
        </section>
      ) : null}
      {canConfirm ? (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <h2 className="font-extrabold text-ink">Was the errand completed?</h2>
          <p className="text-sm text-muted">Confirm delivery only if the errand was completed. This confirmation is independent of any payment between the parties.</p>
          {complete.error ? <ApiError error={complete.error} fallback="We could not confirm completion." /> : null}
          {complete.isSuccess ? <Alert variant="ok" role="status">Delivery confirmed. The assignment status is refreshing.</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={complete.isPending} onClick={() => complete.mutate()}>{complete.isPending ? 'Confirming…' : 'Confirm completion'}</Button>
            <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}/dispute`}>Something is wrong</Link></Button>
          </div>
        </section>
      ) : errand.status === 'COMPLETED' ? (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <Alert variant="ok" role="status">This errand has been completed.</Alert>
          <Button asChild className="w-fit"><Link href={`/assignments/${assignmentId}/rating`}>Rate this errand</Link></Button>
        </section>
      ) : errand.status !== 'DELIVERED' ? (
        <Alert variant="warn" role="status">Delivery confirmation becomes available after the runner records delivery.</Alert>
      ) : current.role !== 'REQUESTER' ? (
        <Alert variant="warn" role="status">The requester confirms whether the errand was completed.</Alert>
      ) : (
        <Alert variant="ok" role="status">This errand has been completed.</Alert>
      )}
    </main>
  );
}

function ApiError({ error, fallback, onRetry }: { error: unknown; fallback: string; onRetry?: () => void }) {
  return (
    <Alert variant="danger" role="alert">
      <p>{isApiError(error) ? error.message : fallback}</p>
      {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
      {onRetry ? <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onRetry}>Try again</Button> : null}
    </Alert>
  );
}
