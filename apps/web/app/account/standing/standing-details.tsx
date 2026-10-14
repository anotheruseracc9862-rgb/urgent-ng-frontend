'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton, Textarea } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import type { EnforcementAction } from '@/lib/api/types';
import { authApi } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';

const ACTION_LABEL: Record<EnforcementAction['type'], string> = {
  WARNING: 'Warning',
  FEATURE_RESTRICTION: 'Feature restriction',
  TEMPORARY_SUSPENSION: 'Temporary suspension',
  PERMANENT_SUSPENSION: 'Permanent suspension',
  BADGE_REMOVAL: 'Badge removal',
  VERIFICATION_REVOCATION: 'Verification revoked',
  CONTENT_REMOVAL: 'Content removed',
};

function appealErrorMessage(error: unknown): string {
  if (isApiError(error) && error.code === 'RESOURCE_CONFLICT') {
    const reason = error.details.reason;
    if (reason === 'ALREADY_APPEALED') return 'An appeal has already been submitted for this action.';
    if (reason === 'NOT_APPEALABLE') return 'This action is not eligible for appeal.';
    if (reason === 'NO_OPEN_APPEAL') return 'This action no longer has an open appeal.';
  }
  if (isApiError(error) && error.requestId) return `We could not submit the appeal. Request ID: ${error.requestId}`;
  return 'We could not submit the appeal. Please try again.';
}

function AppealForm({ action, onAppeal, busy, error }: {
  action: EnforcementAction;
  onAppeal: (actionId: string, note: string) => void;
  busy: boolean;
  error?: unknown;
}) {
  const [note, setNote] = useState('');
  return (
    <form className="mt-4 grid gap-3 border-t border-line pt-4" onSubmit={(event) => {
      event.preventDefault();
      if (note.trim()) onAppeal(action.id, note.trim());
    }}>
      <label htmlFor={`appeal-${action.id}`} className="grid gap-2 text-sm font-bold text-ink">
        Why should this decision be reconsidered?
        <Textarea id={`appeal-${action.id}`} aria-label="Appeal explanation" value={note} maxLength={1000} required onChange={(event) => setNote(event.target.value)} />
        <span className="text-right text-xs font-normal text-muted">{note.length}/1000</span>
      </label>
      {error ? <p className="text-sm text-red" role="alert">{appealErrorMessage(error)}</p> : null}
      <Button type="submit" size="sm" disabled={busy || note.trim().length === 0}>{busy ? 'Submitting…' : 'Submit appeal'}</Button>
    </form>
  );
}

export function StandingDetails() {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const enforcementKey = queryKeys.account.enforcement(me.id);
  const reliabilityKey = queryKeys.account.reliability(me.id);
  const enforcement = useQuery({ queryKey: enforcementKey, queryFn: authApi.enforcement });
  const reliability = useQuery({
    queryKey: reliabilityKey,
    queryFn: authApi.reliability,
    enabled: me.status !== 'DELETION_PENDING',
  });
  const appeal = useMutation({
    mutationFn: ({ actionId, note }: { actionId: string; note: string }) => authApi.appeal(actionId, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: enforcementKey }),
  });

  if (enforcement.isLoading || reliability.isLoading) {
    return <div className="grid gap-4"><Skeleton className="h-48 rounded-[var(--r-lg)]" /><Skeleton className="h-48 rounded-[var(--r-lg)]" /></div>;
  }

  return (
    <div className="grid gap-4">
      {enforcement.error ? (
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>We could not load your enforcement history.</p>
            {isApiError(enforcement.error) && enforcement.error.requestId ? <p className="text-xs">Request ID: {enforcement.error.requestId}</p> : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => void enforcement.refetch()}>Try again</Button>
          </div>
        </Alert>
      ) : (
        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-5 shadow-[var(--shadow)]">
          <header className="border-b border-line pb-3">
            <h2 className="font-extrabold text-ink">Warnings and restrictions</h2>
            <p className="mt-1 text-xs text-muted">Review each decision, its reason, and when it applies.</p>
          </header>
          {!enforcement.data?.length ? (
            <p className="py-5 text-sm text-muted">There are no warnings or restrictions on your account.</p>
          ) : (
            <ul className="divide-y divide-line">
              {enforcement.data.map((action) => (
                <li className="py-4 first:pt-4 last:pb-0" key={action.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-ink">{ACTION_LABEL[action.type]}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${action.status === 'ACTIVE' ? 'bg-amber-bg text-amber' : 'bg-panel text-muted'}`}>{action.status === 'ACTIVE' ? 'Active' : action.status === 'EXPIRED' ? 'Ended' : 'Revoked'}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-2">{action.reason}</p>
                  <p className="mt-1 text-xs text-muted">
                    Started {formatDate(action.startsAt, 'long')} (Lagos time)
                    {action.endsAt ? ` · Ends ${formatDate(action.endsAt, 'long')} (Lagos time)` : ''}
                  </p>
                  {action.appeal.requestedAt ? (
                    <p className="mt-2 text-xs text-muted">
                      Appeal submitted {formatDate(action.appeal.requestedAt, 'short')}
                      {action.appeal.dueAt ? ` · Response expected by ${formatDate(action.appeal.dueAt, 'short')}` : ''}
                      {action.appeal.outcome ? ` · Outcome: ${action.appeal.outcome}` : ''}
                    </p>
                  ) : null}
                  {action.canAppeal ? (
                    <AppealForm
                      action={action}
                      onAppeal={(actionId, note) => appeal.mutate({ actionId, note })}
                      busy={appeal.isPending && appeal.variables?.actionId === action.id}
                      error={appeal.variables?.actionId === action.id ? appeal.error : undefined}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {reliability.error ? (
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>We could not load your reliability details.</p>
            {isApiError(reliability.error) && reliability.error.requestId ? <p className="text-xs">Request ID: {reliability.error.requestId}</p> : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => void reliability.refetch()}>Try again</Button>
          </div>
        </Alert>
      ) : reliability.data ? (
        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-5 shadow-[var(--shadow)]">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="font-extrabold text-ink">Reliability points</h2>
              <p className="mt-1 text-xs text-muted">Events in the rolling {reliability.data.windowDays}-day window that contribute to your score.</p>
            </div>
            <span className="rounded-full bg-tint px-3 py-1 text-sm font-extrabold text-green-900">{reliability.data.points} points</span>
          </header>
          <p className="mt-3 text-sm text-muted">
            Thresholds: warning {reliability.data.thresholds.warning}, restriction {reliability.data.thresholds.restriction}, suspension {reliability.data.thresholds.suspension}, admin review {reliability.data.thresholds.adminReview}.
            {reliability.data.reached ? ` Current level: ${reliability.data.reached.toLowerCase().replace('_', ' ')}.` : ' No threshold reached.'}
          </p>
          {!reliability.data.events.length ? (
            <p className="py-5 text-sm text-muted">No reliability events are currently contributing points.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {reliability.data.events.map((event) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={event.id}>
                  <span className="text-sm font-bold text-ink">{event.type.replaceAll('_', ' ').toLowerCase()}</span>
                  <span className="text-xs text-muted">{formatDate(event.occurredAt, 'long')} · {event.points} points</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
