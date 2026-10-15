'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { MediaUpload } from '@/components/media-upload/media-upload';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { RunnerLocationSharing } from '@/features/location/share/runner-location-sharing';

type Step = 'start' | 'pickup' | 'deliver';

const stepCopy: Record<Step, { title: string; action: string; purpose?: components['schemas']['MediaPurpose']; noteLabel?: string }> = {
  start: { title: 'Start the errand', action: 'Start errand' },
  pickup: { title: 'Record pickup', action: 'Confirm pickup', purpose: 'PICKUP_EVIDENCE', noteLabel: 'Pickup note' },
  deliver: { title: 'Record delivery', action: 'Confirm delivery', purpose: 'DELIVERY_EVIDENCE', noteLabel: 'Recipient or delivery note' },
};

function nextStep(status: string): Step | null {
  if (status === 'ACCEPTED') return 'start';
  if (status === 'IN_PROGRESS') return 'pickup';
  if (status === 'PICKED_UP') return 'deliver';
  return null;
}

export function RunnerExecutionPage({ assignmentId }: { assignmentId: string }) {
  const queryClient = useQueryClient();
  const key = queryKeys.assignments.detail(assignmentId);
  const assignment = useQuery({
    queryKey: key,
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
  });
  const [note, setNote] = useState('');
  const [mediaId, setMediaId] = useState<string>();
  const execute = useMutation({
    mutationFn: (currentStep: Step) => offersApi.executionStep(assignmentId, currentStep, currentStep === 'start'
      ? undefined
      : {
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(mediaId ? { mediaId } : {}),
        }),
    onSuccess: async () => {
      setNote('');
      setMediaId(undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments.timeline(assignmentId) }),
      ]);
      await assignment.refetch();
    },
    onError: async (error) => {
      if (isApiError(error) && error.code === 'ERRAND_INVALID_STATE') await assignment.refetch();
    },
  });

  if (assignment.isLoading) {
    return <main className="mx-auto grid max-w-3xl gap-4"><Skeleton className="h-10 w-44" /><Skeleton className="h-48 rounded-[var(--r-lg)]" /></main>;
  }
  if (assignment.error || !assignment.data) {
    return (
      <main className="mx-auto max-w-3xl">
        <Alert variant="danger" role="alert">
          <p>{isApiError(assignment.error) && assignment.error.code === 'RESOURCE_NOT_FOUND'
            ? 'This assignment could not be found, or you do not have permission to view it.'
            : 'We could not load the assignment steps.'}</p>
          {isApiError(assignment.error) && assignment.error.requestId ? <p className="mt-1 text-xs">Request ID: {assignment.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void assignment.refetch()}>Try again</Button>
        </Alert>
      </main>
    );
  }

  if (assignment.data.data.role !== 'RUNNER' || assignment.data.data.status !== 'ACCEPTED') {
    return (
      <main className="mx-auto grid max-w-3xl gap-3">
        <Alert variant="warn" role="status">Execution steps are available to the assigned runner while the assignment is active.</Alert>
        <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}`}>Back to assignment</Link></Button>
      </main>
    );
  }

  const currentStep = nextStep(assignment.data.data.errand.status);
  const copy = currentStep ? stepCopy[currentStep] : null;

  return (
    <main className="mx-auto grid max-w-3xl gap-4">
      <Link href={`/assignments/${assignmentId}`} className="w-fit text-sm font-bold text-green-800 hover:underline">← Back to assignment</Link>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Runner execution</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{assignment.data.data.errand.title}</h1>
        <p className="mt-2 text-sm text-muted">Current step: {assignment.data.data.errand.status.toLowerCase().replaceAll('_', ' ')}.</p>
      </header>
      <RunnerLocationSharing assignmentId={assignmentId} />

      {execute.error ? (
        <Alert variant="danger" role="alert">
          <p>{isApiError(execute.error) && execute.error.code === 'ERRAND_INVALID_STATE'
            ? 'The errand status changed. We refreshed the available next step.'
            : isApiError(execute.error)
              ? execute.error.message
              : 'We could not record this step.'}</p>
          {isApiError(execute.error) && execute.error.requestId ? <p className="mt-1 text-xs">Request ID: {execute.error.requestId}</p> : null}
          <Button type="button" variant="ghost" className="mt-2" onClick={() => void assignment.refetch()}>Refresh assignment</Button>
        </Alert>
      ) : null}
      {execute.isSuccess ? <Alert variant="ok" role="status">Step recorded. The assignment has been refreshed.</Alert> : null}

      {copy ? (
        <section className="grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-6">
          <div>
            <h2 className="text-lg font-extrabold text-ink">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted">Only the next valid step is available. The server confirms each status transition.</p>
          </div>
          {copy.noteLabel ? (
            <>
              <label className="grid gap-1 text-sm font-bold text-ink">{copy.noteLabel}
                <textarea maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24 rounded-lg border border-line bg-panel p-3 text-sm font-normal" />
              </label>
              <div>
                <p className="mb-2 text-sm font-bold text-ink">Optional photo evidence</p>
                <MediaUpload purpose={copy.purpose!} maxFiles={1} value={mediaId ? [mediaId] : []} onChange={(ids: string[]) => setMediaId(ids[0])} />
              </div>
            </>
          ) : null}
          <Button type="button" className="w-fit" disabled={execute.isPending} onClick={() => execute.mutate(currentStep!)}>
            {execute.isPending ? 'Recording…' : copy.action}
          </Button>
        </section>
      ) : (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-5">
          <h2 className="font-extrabold text-ink">No further runner step is available</h2>
          <p className="text-sm text-muted">The errand is currently {assignment.data.data.errand.status.toLowerCase().replaceAll('_', ' ')}. View the assignment for its current timeline and next actions.</p>
          <Button asChild variant="ghost" className="w-fit"><Link href={`/assignments/${assignmentId}`}>View assignment</Link></Button>
        </section>
      )}
    </main>
  );
}
