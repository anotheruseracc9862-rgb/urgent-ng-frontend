'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { flowOf } from '@/features/reference/flow';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Alert, Button, Skeleton, Textarea } from '@urgent/ui';
import type { components } from '@urgent/api-client';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { errandsApi } from '../api';
import { cancellationError, consequence } from './cancel-copy';

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
  const cancel = useApiMutation({ affects: ['errands'],
    // No reason is sent before a runner is involved: the server records the requester changing their mind.
    mutationFn: (askReason: boolean) => errandsApi.cancel(errandId, { ...(askReason ? { reason } : {}), ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.errands.detail(errandId), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.errands.lists() });
      router.replace(`/errands/${errandId}`);
    },
  });

  if (errandQuery.isPending) {
    return <PageLoading title="Cancel errand" eyebrow="Errand" width="max-w-5xl" />;
  }
  if (errandQuery.error || !errandQuery.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert variant="danger" role="alert">
          <div className="grid gap-3">
            <p>{isApiError(errandQuery.error) && errandQuery.error.code === 'RESOURCE_NOT_FOUND' ? 'This errand could not be found, or you do not have permission to view it.' : 'We could not load this errand.'}</p>
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
  // A draft or an open errand has no runner yet, so nobody needs to be told why. Later, someone does.
  const askReason = !['DRAFT', 'OPEN'].includes(errand.status);
  const blockedAction = cancel.error && isApiError(cancel.error) ? cancel.error.details.suggestedAction : null;
  const assignmentHref = errand.assignment ? `/assignments/${errand.assignment.id}` : null;

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-800">{errand.id} · {errand.category.name}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{errand.status === 'DRAFT' ? 'Delete this draft' : 'Cancel this errand'}</h1>
        <p className="mt-1 text-sm text-muted max-sm:hidden">{askReason ? 'What happens depends on the current stage. The reason is recorded with the errand.' : 'No runner has been selected, so this takes one tap.'}</p>
      </header>

      <section className="rounded-[var(--r-lg)] border border-line bg-tint p-4 sm:p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">{errand.status.replaceAll('_', ' ')}</p>
        <h2 className="mt-1 break-words text-lg font-extrabold text-ink">{errand.title}</h2>
        <p className="mt-1 text-sm text-muted"><LocationSummary location={errand.pickup} />{errand.pickup && errand.destination ? ' → ' : null}<LocationSummary location={errand.destination} /></p>
        <Alert variant={allowed ? 'warn' : 'info'} className="mt-4">{consequence(errand.status, flowOf(errand.category) === 'SERVICE')}</Alert>
      </section>

      {cancel.error ? (
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>{cancellationError(cancel.error, errand.category)}</p>
            {blockedAction && assignmentHref ? <Link className="font-bold underline" href={assignmentHref}>Open assignment hub</Link> : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => { cancel.reset(); void errandQuery.refetch(); }}>Refresh errand</Button>
          </div>
        </Alert>
      ) : null}

      {allowed ? (
        <form
          className="grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5"
          onSubmit={(event) => { event.preventDefault(); cancel.mutate(askReason); }}
        >
          {askReason ? (
            <fieldset className="grid gap-3">
              <legend className="font-extrabold text-ink">Why are you cancelling?</legend>
              <p className="-mt-1 text-sm text-muted">Pick the closest one. The runner is told.</p>
              <div role="radiogroup" aria-label="Reason" className="flex flex-wrap gap-2">
                {REASONS.map((item) => (
                  <label key={item.value} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-700 motion-reduce:transition-none ${reason === item.value ? 'border-green-800 bg-green-800 text-white' : 'border-line bg-surface text-ink hover:bg-panel'}`}>
                    <input type="radio" name="cancel-reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} className="sr-only" />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <h2 className="font-extrabold text-ink">{errand.status === 'DRAFT' ? 'Delete this draft?' : 'Cancel this errand?'}</h2>
          )}
          <details className="group">
            <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 text-sm font-bold text-green-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 [&::-webkit-details-marker]:hidden">
              Add a note <span className="font-normal text-muted">Optional</span>
              <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="mt-2 grid gap-2">
              <Textarea id="cancel-note" aria-label="Note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add context for the cancellation" />
              <span className="text-xs text-muted">{note.length}/500</span>
            </div>
          </details>
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
