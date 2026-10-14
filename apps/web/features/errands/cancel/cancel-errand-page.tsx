'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton, Textarea } from '@urgent/ui';
import type { components } from '@urgent/api-client';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { errandsApi } from '../api';

type Errand = components['schemas']['ErrandDto'];
type CancelReason = 'REQUESTER_CANCELLED' | 'DUPLICATE_ERRAND' | 'NO_RUNNER_AVAILABLE' | 'SAFETY_CONCERN' | 'OTHER';

const REASONS: Array<{ value: CancelReason; label: string }> = [
  { value: 'REQUESTER_CANCELLED', label: 'My plans changed' },
  { value: 'DUPLICATE_ERRAND', label: 'I posted this twice' },
  { value: 'NO_RUNNER_AVAILABLE', label: 'No suitable runner' },
  { value: 'SAFETY_CONCERN', label: 'Safety concern' },
  { value: 'OTHER', label: 'Something else' },
];

const CANCELLABLE = ['DRAFT', 'OPEN', 'RUNNER_SELECTED', 'ACCEPTED', 'IN_PROGRESS'];

function consequence(status: Errand['status']) {
  switch (status) {
    case 'DRAFT': return 'The draft is closed and will no longer appear in your active drafts.';
    case 'OPEN': return 'The errand and its offers will close. No runner has been selected.';
    case 'RUNNER_SELECTED': return 'The selected runner will be notified. The selection and cancellation reason will be recorded.';
    case 'ACCEPTED': return 'The accepted runner will be notified and the reason will be recorded.';
    case 'IN_PROGRESS': return 'This is recorded as a late cancellation and may affect account reliability.';
    case 'PICKED_UP': return 'Cancellation is not available after pickup. Open a dispute if something is wrong.';
    case 'DELIVERED': return 'Cancellation is not available after delivery. Confirm completion or open a dispute.';
    case 'DISPUTED': return 'This errand is already under review. Continue in the assignment hub.';
    default: return 'This errand is already closed.';
  }
}

function cancellationError(error: unknown) {
  if (!isApiError(error)) return 'We could not cancel this errand. Please try again.';
  if (error.code === 'ERRAND_EXPIRED') return 'This errand expired before it could be cancelled. Refresh to see its current status.';
  if (error.code === 'ERRAND_INVALID_STATE') {
    const action = error.details.suggestedAction;
    if (action === 'OPEN_DISPUTE') return 'The item has been picked up. Cancellation is blocked; open a dispute from the assignment hub.';
    if (action === 'COMPLETE_OR_DISPUTE') return 'The errand was delivered. Confirm completion or open a dispute from the assignment hub.';
    return 'The errand changed status before cancellation could finish. Refresh to see the available actions.';
  }
  return error.message;
}

function LocationSummary({ location }: { location: Errand['pickup'] }) {
  if (!location) return null;
  return <span>{location.addressText || location.landmark || location.area}</span>;
}

export function CancelErrandPage({ errandId }: { errandId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<CancelReason>('REQUESTER_CANCELLED');
  const [note, setNote] = useState('');
  const errandQuery = useQuery({
    queryKey: queryKeys.errands.detail(errandId),
    queryFn: () => errandsApi.get(errandId),
  });
  const cancel = useMutation({
    mutationFn: () => errandsApi.cancel(errandId, { reason, ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.errands.detail(errandId), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.errands.lists() });
      router.replace(`/errands/${errandId}`);
    },
  });

  if (errandQuery.isLoading) {
    return <div className="mx-auto grid max-w-5xl gap-4"><Skeleton className="h-12" /><Skeleton className="h-64 rounded-[var(--r-lg)]" /><Skeleton className="h-48 rounded-[var(--r-lg)]" /></div>;
  }
  if (errandQuery.error || !errandQuery.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert variant="danger" role="alert">
          <div className="grid gap-3">
            <p>{isApiError(errandQuery.error) && errandQuery.error.code === 'RESOURCE_NOT_FOUND' ? 'This errand could not be found, or you do not have permission to view it.' : 'We could not load this errand.'}</p>
            {isApiError(errandQuery.error) && errandQuery.error.requestId ? <p className="text-xs">Request ID: {errandQuery.error.requestId}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => void errandQuery.refetch()}>Try again</Button>
              <Button asChild variant="soft"><Link href="/errands">My errands</Link></Button>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  const errand = errandQuery.data;
  const allowed = CANCELLABLE.includes(errand.status);
  const blockedAction = cancel.error && isApiError(cancel.error) ? cancel.error.details.suggestedAction : null;
  const assignmentHref = errand.assignment ? `/assignments/${errand.assignment.id}` : null;

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-800">{errand.id} · {errand.category.name}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{errand.status === 'DRAFT' ? 'Delete this draft' : 'Cancel this errand'}</h1>
        <p className="mt-1 text-sm text-muted">What happens depends on the current stage. The reason is recorded with the errand.</p>
      </header>

      <section className="rounded-[var(--r-lg)] border border-line bg-tint p-4 sm:p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">{errand.status.replaceAll('_', ' ')}</p>
        <h2 className="mt-1 break-words text-lg font-extrabold text-ink">{errand.title}</h2>
        <p className="mt-1 text-sm text-muted"><LocationSummary location={errand.pickup} />{errand.pickup && errand.destination ? ' → ' : null}<LocationSummary location={errand.destination} /></p>
        <Alert variant={allowed ? 'warn' : 'info'} className="mt-4">{consequence(errand.status)}</Alert>
      </section>

      {cancel.error ? (
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>{cancellationError(cancel.error)}</p>
            {isApiError(cancel.error) && cancel.error.requestId ? <p className="text-xs">Request ID: {cancel.error.requestId}</p> : null}
            {blockedAction && assignmentHref ? <Link className="font-bold underline" href={assignmentHref}>Open assignment hub</Link> : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => { cancel.reset(); void errandQuery.refetch(); }}>Refresh errand</Button>
          </div>
        </Alert>
      ) : null}

      {allowed ? (
        <form
          className="grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5"
          onSubmit={(event) => { event.preventDefault(); cancel.mutate(); }}
        >
          <div>
            <h2 className="font-extrabold text-ink">Why are you cancelling?</h2>
            <p className="mt-1 text-sm text-muted">Choose the closest reason. You can add a short note for context.</p>
          </div>
          <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="cancel-reason">
            Reason
            <select id="cancel-reason" required value={reason} onChange={(event) => setReason(event.target.value as CancelReason)} className="min-h-11 rounded-[var(--r)] border border-line bg-surface px-3 text-sm">
              {REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="cancel-note">
            Note <span className="font-normal text-muted">Optional</span>
            <Textarea id="cancel-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add context for the cancellation" />
            <span className="text-xs font-normal text-muted">{note.length}/500</span>
          </label>
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Button asChild variant="ghost"><Link href={`/errands/${errandId}`}>Keep errand</Link></Button>
            <Button type="submit" variant="danger" isLoading={cancel.isPending}>{errand.status === 'DRAFT' ? 'Delete draft' : 'Cancel errand'}</Button>
          </div>
        </form>
      ) : (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 sm:flex sm:items-center sm:justify-between sm:p-5">
          <p className="text-sm text-ink-2">Cancellation is unavailable at this stage. Use the available action to continue.</p>
          <div className="flex flex-wrap gap-2">
            {assignmentHref ? <Button asChild><Link href={assignmentHref}>Open assignment hub</Link></Button> : null}
            <Button asChild variant="ghost"><Link href={`/errands/${errandId}`}>Back to errand</Link></Button>
          </div>
        </section>
      )}
    </div>
  );
}
