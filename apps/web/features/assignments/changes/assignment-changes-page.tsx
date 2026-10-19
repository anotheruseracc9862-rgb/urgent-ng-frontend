'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi, type ChangeRequest } from '@/features/offers/api';
import { JourneyHere } from '@/features/journey/journey-context';
import { LagosDateTimeField } from '@/components/forms/lagos-date-time-field';
import { availableActions } from '../available-actions';

type ChangeType = components['schemas']['CreateChangeRequestDto']['type'];

const changeTypes: ChangeType[] = ['AMOUNT', 'PICKUP', 'DESTINATION', 'TIME', 'OTHER'];

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(minor: number, currency: string) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(minor / 100);
}

function countdown(deadline: string, now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(deadline) - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours}h ${minutes}m ${remainder}s`;
}

function changePayload(
  type: ChangeType,
  fields: { amount: string; lat: string; lng: string; address: string; landmark: string; scheduledAt: string; other: string },
  isScheduled: boolean,
): Record<string, unknown> | null {
  if (type === 'AMOUNT') {
    const amountMinor = Math.round(Number(fields.amount) * 100);
    return Number.isFinite(amountMinor) && amountMinor > 0 ? { amountMinor } : null;
  }
  if (type === 'PICKUP' || type === 'DESTINATION') {
    const lat = Number(fields.lat);
    const lng = Number(fields.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return null;
    return {
      point: { lat, lng },
      ...(fields.address.trim() ? { addressText: fields.address.trim() } : {}),
      ...(fields.landmark.trim() ? { landmark: fields.landmark.trim() } : {}),
    };
  }
  if (type === 'TIME') {
    if (!isScheduled || !fields.scheduledAt) return null;
    const date = new Date(fields.scheduledAt);
    return Number.isNaN(date.getTime()) ? null : { scheduledAt: date.toISOString() };
  }
  return fields.other.trim() ? { note: fields.other.trim() } : null;
}

function RequestSummary({ request, now }: { request: ChangeRequest; now: number }) {
  const amountMinor = request.type === 'AMOUNT' && typeof request.payload.amountMinor === 'number'
    ? request.payload.amountMinor
    : null;
  return (
    <li className="grid gap-2 rounded-xl bg-panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-ink">{label(request.type)} · {label(request.status)}</p>
        {request.status === 'PENDING' ? <p className="text-xs font-bold text-amber-900">Expires in {countdown(request.expiresAt, now)}</p> : null}
      </div>
      {amountMinor !== null ? <p className="text-sm text-ink-2">Proposed fee: {money(amountMinor, 'NGN')}</p> : null}
      {request.type !== 'AMOUNT' ? <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-ink-2">{JSON.stringify(request.payload, null, 2)}</pre> : null}
      <time className="text-xs text-muted" dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleString()}</time>
    </li>
  );
}

export function AssignmentChangesPage({ assignmentId }: { assignmentId: string }) {
  const client = useQueryClient();
  const assignmentKey = queryKeys.assignments.detail(assignmentId);
  const requestsKey = queryKeys.assignments.changeRequests(assignmentId);
  const paymentKey = queryKeys.assignments.paymentAgreement(assignmentId);
  const assignment = useQuery({ queryKey: assignmentKey, queryFn: () => offersApi.assignment(assignmentId), retry: false });
  const requests = useQuery({ queryKey: requestsKey, queryFn: () => offersApi.changeRequests(assignmentId), retry: false });
  const payment = useQuery({ queryKey: paymentKey, queryFn: () => offersApi.paymentAgreement(assignmentId), retry: false });
  const [type, setType] = useState<ChangeType>('AMOUNT');
  const [amount, setAmount] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [other, setOther] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const create = useApiMutation({ affects: ['assignments'],
    mutationFn: (payload: Record<string, unknown>) => offersApi.createChangeRequest(assignmentId, { type, payload }),
    onSuccess: async () => {
      setOther('');
      await client.invalidateQueries({ queryKey: requestsKey });
    },
    onError: async (error) => {
      if (isApiError(error) && error.code === 'CHANGE_REQUEST_PENDING') await requests.refetch();
    },
  });
  const respond = useApiMutation({ affects: ['assignments'],
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' | 'cancel' }) => offersApi.respondToChangeRequest(id, action),
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: requestsKey });
      if (result.status === 'ACCEPTED' && result.type === 'AMOUNT') {
        await client.invalidateQueries({ queryKey: paymentKey });
      }
    },
  });

  if (assignment.isPending || requests.isPending) {
    return <PageLoading title="Change requests" eyebrow="Assignment" width="max-w-3xl" />;
  }
  if (assignment.error || !assignment.data || requests.error || !requests.data) {
    const error = assignment.error ?? requests.error;
    return (
      <main className="mx-auto max-w-3xl">
        <ApiError error={error} fallback="We could not load change requests." onRetry={() => { void assignment.refetch(); void requests.refetch(); }} />
      </main>
    );
  }

  const current = assignment.data.data;
  const myId = current.role === 'REQUESTER' ? current.requesterId : current.runnerId;
  const pending = requests.data.find((request) => request.status === 'PENDING');
  const canPropose = availableActions(current.role, current.status, current.errand.status).changeRequest;
  const isScheduled = Boolean(current.errand.scheduledAt);
  const payload = changePayload(type, { amount, lat, lng, address, landmark, scheduledAt, other }, isScheduled);

  return (
    <main className="mx-auto grid max-w-3xl gap-4">
      <Link href={`/assignments/${assignmentId}`} className="w-fit text-sm font-bold text-green-800 hover:underline">← Back to assignment</Link>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Change requests</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{current.errand.title}</h1>
        {payment.data ? <p className="mt-2 text-sm text-muted">Agreed runner fee: <strong className="text-ink">{money(payment.data.agreedAmountMinor, payment.data.currency)}</strong></p> : null}
      </header>
      <JourneyHere />
      {payment.error ? <ApiError error={payment.error} fallback="We could not load the current payment agreement." onRetry={() => void payment.refetch()} /> : null}
      <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <h2 className="font-extrabold text-ink">Request history</h2>
        {requests.data.length
          ? <ul className="grid gap-2">{requests.data.map((request) => <RequestSummary key={request.id} request={request} now={now} />)}</ul>
          : <p className="text-sm text-muted">No changes have been requested. The agreed terms stay in effect until both parties accept a change.</p>}
        {pending ? (
          <div className="flex flex-wrap gap-2">
            {pending.requestedBy === myId ? (
              <Button type="button" variant="ghost" disabled={respond.isPending} onClick={() => respond.mutate({ id: pending.id, action: 'cancel' })}>Cancel request</Button>
            ) : (
              <>
                <Button type="button" disabled={respond.isPending} onClick={() => respond.mutate({ id: pending.id, action: 'accept' })}>Accept change</Button>
                <Button type="button" variant="ghost" disabled={respond.isPending} onClick={() => respond.mutate({ id: pending.id, action: 'reject' })}>Reject change</Button>
              </>
            )}
          </div>
        ) : null}
      </section>
      {!pending && !canPropose ? (
        <Alert variant="info" role="status">
          <p className="font-extrabold">New change requests are closed</p>
          <p className="mt-1">Amount, address and time can only be changed before pickup. If something is wrong now, open a dispute from the assignment page.</p>
        </Alert>
      ) : null}
      {!pending && canPropose ? (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <h2 className="font-extrabold text-ink">Propose a change</h2>
          <label className="grid gap-1 text-sm font-bold text-ink">Change type
            <select value={type} onChange={(event) => setType(event.target.value as ChangeType)} className="rounded-lg border border-line bg-panel p-3 font-normal">
              {changeTypes.filter((option) => option !== 'TIME' || isScheduled).map((option) => <option key={option} value={option}>{label(option)}</option>)}
            </select>
          </label>
          {type === 'AMOUNT' ? (
            <label className="grid gap-1 text-sm font-bold text-ink">New runner fee (NGN)
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-lg border border-line bg-panel p-3 font-normal" />
            </label>
          ) : null}
          {type === 'PICKUP' || type === 'DESTINATION' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-bold text-ink">Latitude
                  <input type="number" min={-90} max={90} step="any" value={lat} onChange={(event) => setLat(event.target.value)} className="rounded-lg border border-line bg-panel p-3 font-normal" />
                </label>
                <label className="grid gap-1 text-sm font-bold text-ink">Longitude
                  <input type="number" min={-180} max={180} step="any" value={lng} onChange={(event) => setLng(event.target.value)} className="rounded-lg border border-line bg-panel p-3 font-normal" />
                </label>
              </div>
              <label className="grid gap-1 text-sm font-bold text-ink">Address details (optional)
                <input value={address} onChange={(event) => setAddress(event.target.value)} className="rounded-lg border border-line bg-panel p-3 font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-ink">Landmark (optional)
                <input value={landmark} onChange={(event) => setLandmark(event.target.value)} className="rounded-lg border border-line bg-panel p-3 font-normal" />
              </label>
            </>
          ) : null}
          {type === 'TIME' ? (
            <LagosDateTimeField id="change-scheduled-at" label="New scheduled time" value={scheduledAt || null} onChange={(value) => setScheduledAt(value ?? '')} />
          ) : null}
          {type === 'OTHER' ? (
            <label className="grid gap-1 text-sm font-bold text-ink">Explain the requested change
              <textarea maxLength={500} value={other} onChange={(event) => setOther(event.target.value)} className="min-h-20 rounded-lg border border-line bg-panel p-3 font-normal" />
            </label>
          ) : null}
          {create.error ? <ApiError error={create.error} fallback="We could not propose this change." /> : null}
          {create.isSuccess ? <Alert variant="ok" role="status">Change request sent. The other party has until the expiry time to answer.</Alert> : null}
          <Button type="button" className="w-fit" disabled={!payload || create.isPending} onClick={() => payload && create.mutate(payload)}>
            {create.isPending ? 'Sending…' : 'Send change request'}
          </Button>
          <p className="text-xs text-muted">Only one change request may be pending at a time. The other party must respond before the expiry time or pickup, whichever comes first.</p>
        </section>
      ) : null}
      {respond.error ? <ApiError error={respond.error} fallback="We could not update the change request." /> : null}
      {respond.isSuccess ? <Alert variant="ok" role="status">The change request was updated.</Alert> : null}
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
