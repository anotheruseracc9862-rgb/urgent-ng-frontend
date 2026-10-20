'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { PageHead } from '@/components/shell/page-head';
import { ArrowLeft } from 'lucide-react';
import { Alert, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { cancellationGuidance } from './cancellation-guidance';
import { JourneyHere } from '@/features/journey/journey-context';

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
    return <PageLoading title="Cancel assignment" eyebrow="Assignment" width="max-w-5xl" />;
  }
  if (assignment.error || !assignment.data) {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
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
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={`/assignments/${assignmentId}`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to assignment</Link>
      <PageHead
        eyebrow="Cancel assignment"
        title={<span className="block max-w-[760px] break-words">{current.errand.title}</span>}
        description="Cancelling ends this assignment for both of you."
      />
      <JourneyHere />
      <Alert variant={guidance.canCancel ? 'warn' : 'info'} role="status">{guidance.message}</Alert>
      {completed ? (
        <Alert variant="ok" role="status">The assignment was cancelled.</Alert>
      ) : guidance.canCancel ? (
        <section className="grid min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] gap-4" aria-labelledby="cancel-form">
          <h2 id="cancel-form" className="text-base font-extrabold text-ink">Why are you cancelling?</h2>
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-ink-2" htmlFor="cancel-reason">Reason</label>
            <Select value={reason} onValueChange={(value) => setReason(value as CancelReason)}>
              <SelectTrigger id="cancel-reason"><SelectValue /></SelectTrigger>
              <SelectContent>{reasons.map((item) => <SelectItem key={item} value={item}>{label(item)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-ink-2" htmlFor="cancel-note">Additional details <span className="font-normal text-muted">(optional)</span></label>
            <Textarea id="cancel-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          {cancel.error ? <ApiError error={cancel.error} fallback="We could not cancel this assignment." /> : null}
          {action === 'DECLINE' ? (
            <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}`}>Go to assignment response</Link></Button>
          ) : null}
          <div className="flex justify-end border-t border-line-2 pt-4">
            <Button type="button" variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? 'Cancelling…' : 'Cancel assignment'}
            </Button>
          </div>
        </section>
      ) : (
        <section className="grid min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] content-start gap-3">
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
      {onRetry ? <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onRetry}>Try again</Button> : null}
    </Alert>
  );
}
