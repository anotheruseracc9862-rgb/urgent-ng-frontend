'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { cancellationGuidance } from './cancellation-guidance';

type CancelReason = components['schemas']['CancelAssignmentDto']['reason'];
const requesterReasons: CancelReason[] = ['REQUESTER_CANCELLED', 'DUPLICATE_ERRAND', 'SAFETY_CONCERN', 'NO_RUNNER_AVAILABLE', 'OTHER'];
const runnerReasons: CancelReason[] = ['RUNNER_CANCELLED', 'SAFETY_CONCERN', 'OTHER'];

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function suggestedAction(error: unknown): string | null {
  if (!isApiError(error)) return null;
  const action = error.details.suggestedAction;
  return typeof action === 'string' ? action : null;
}

export function AssignmentCancellationPage({ assignmentId }: { assignmentId: string }) {
  const client = useQueryClient();
  const key = queryKeys.assignments.detail(assignmentId);
  const assignment = useQuery({ queryKey: key, queryFn: () => offersApi.assignment(assignmentId), retry: false });
  const [reason, setReason] = useState<CancelReason>('OTHER');
  const [note, setNote] = useState('');
  const cancel = useApiMutation({ affects: ['assignments'],
    mutationFn: () => offersApi.cancelAssignment(assignmentId, {
      reason,
      ...(note.trim() ? { note: note.trim() } : {}),
    }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: queryKeys.errands.all() });
    },
  });

  if (assignment.isPending) {
    return <PageLoading title="Cancel assignment" eyebrow="Assignment" width="max-w-3xl" />;
  }
  if (assignment.error || !assignment.data) {
    return (
      <main className="mx-auto max-w-3xl">
        <ApiError error={assignment.error} fallback="We could not load this assignment." onRetry={() => void assignment.refetch()} />
      </main>
    );
  }

  const current = assignment.data.data;
  const guidance = cancellationGuidance(current.role, current.status, current.errand.status);
  const reasons = current.role === 'REQUESTER' ? requesterReasons : runnerReasons;
  const action = suggestedAction(cancel.error);
  const completed = cancel.data?.status === 'CANCELLED';

  return (
    <main className="mx-auto grid max-w-3xl gap-4">
      <Link href={`/assignments/${assignmentId}`} className="w-fit text-sm font-bold text-green-800 hover:underline">← Back to assignment</Link>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wide text-red-800">Cancel assignment</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{current.errand.title}</h1>
      </header>
      <Alert variant={guidance.canCancel ? 'warn' : 'info'} role="status">{guidance.message}</Alert>
      {completed ? (
        <Alert variant="ok" role="status">The assignment was cancelled.</Alert>
      ) : guidance.canCancel ? (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <label className="grid gap-1 text-sm font-bold text-ink">Reason
            <select value={reason} onChange={(event) => setReason(event.target.value as CancelReason)} className="rounded-lg border border-line bg-panel p-3 font-normal">
              {reasons.map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-ink">Additional details (optional)
            <textarea maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 rounded-lg border border-line bg-panel p-3 font-normal" />
          </label>
          {cancel.error ? <ApiError error={cancel.error} fallback="We could not cancel this assignment." /> : null}
          {action === 'DECLINE' ? (
            <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}`}>Go to assignment response</Link></Button>
          ) : null}
          <Button type="button" variant="danger" className="w-fit" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel assignment'}
          </Button>
        </section>
      ) : (
        <section className="grid gap-2 rounded-[var(--r-lg)] border border-line bg-surface p-4">
          {cancel.error ? <ApiError error={cancel.error} fallback="Cancellation is unavailable at this stage." /> : null}
          {action === 'OPEN_DISPUTE' || guidance.nextAction === 'OPEN_DISPUTE' ? (
            <Button asChild><Link href={`/assignments/${assignmentId}/dispute`}>Open a dispute</Link></Button>
          ) : null}
          {action === 'COMPLETE_OR_DISPUTE' || guidance.nextAction === 'COMPLETE_OR_DISPUTE' ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild><Link href={`/assignments/${assignmentId}/confirm`}>Confirm completion</Link></Button>
              <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}/dispute`}>Open a dispute</Link></Button>
            </div>
          ) : null}
          {action === 'DECLINE' || guidance.nextAction === 'DECLINE' ? (
            <Button asChild variant="ghost"><Link href={`/assignments/${assignmentId}`}>Decline assignment</Link></Button>
          ) : null}
          {guidance.nextAction === null && !cancel.error ? <p className="text-sm text-muted">No cancellation action is available.</p> : null}
        </section>
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
