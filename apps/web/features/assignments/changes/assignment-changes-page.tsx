'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { PageHead } from '@/components/shell/page-head';
import { ArrowLeft } from 'lucide-react';
import { Alert, Button, Input, MoneyInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@urgent/ui';
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
  fields: { amountMinor: number | null; lat: string; lng: string; address: string; landmark: string; scheduledAt: string; other: string },
  isScheduled: boolean,
): Record<string, unknown> | null {
  if (type === 'AMOUNT') {
    return fields.amountMinor !== null && fields.amountMinor > 0 ? { amountMinor: fields.amountMinor } : null;
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
    <li className="grid gap-2 rounded-[var(--r-sm)] bg-panel p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-ink">{label(request.type)} <span className="font-semibold text-muted">· {label(request.status)}</span></p>
        {request.status === 'PENDING' ? <p className="text-xs font-bold text-amber">Expires in {countdown(request.expiresAt, now)}</p> : null}
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
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
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
    return <PageLoading title="Change requests" eyebrow="Assignment" width="max-w-5xl" />;
  }
  if (assignment.error || !assignment.data || requests.error || !requests.data) {
    const error = assignment.error ?? requests.error;
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <ApiError error={error} fallback="We could not load change requests." onRetry={() => { void assignment.refetch(); void requests.refetch(); }} />
      </main>
    );
  }

  const current = assignment.data.data;
  const myId = current.role === 'REQUESTER' ? current.requesterId : current.runnerId;
  const pending = requests.data.find((request) => request.status === 'PENDING');
  const canPropose = availableActions(current.role, current.status, current.errand.status).changeRequest;
  const isScheduled = Boolean(current.errand.scheduledAt);
  const payload = changePayload(type, { amountMinor, lat, lng, address, landmark, scheduledAt, other }, isScheduled);

  const history = (
    <aside className="grid min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] content-start gap-3 lg:sticky lg:top-6" aria-labelledby="request-history">
      {payment.data ? (
        <div className="rounded-[var(--r)] bg-tint p-4">
          <p className="text-xs font-semibold text-green-900">Agreed runner fee</p>
          <p className="mt-2 break-words text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-ink">{money(payment.data.agreedAmountMinor, payment.data.currency)}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="request-history" className="text-sm font-extrabold text-ink">Request history</h2>
        {pending ? <span className="rounded-full bg-amber-bg px-2.5 py-1 text-[11px] font-bold text-amber">1 pending</span> : null}
      </div>
      {requests.data.length
        ? <ul className="grid gap-2">{requests.data.map((request) => <RequestSummary key={request.id} request={request} now={now} />)}</ul>
        : <p className="text-xs leading-relaxed text-muted">No changes have been requested. The agreed terms stay in effect until both parties accept a change.</p>}
      {pending ? (
        <div className="flex flex-wrap gap-2 border-t border-line-2 pt-3">
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
      {respond.error ? <ApiError error={respond.error} fallback="We could not update the change request." /> : null}
      {respond.isSuccess ? <Alert variant="ok" role="status">The change request was updated.</Alert> : null}
    </aside>
  );

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={`/assignments/${assignmentId}`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to assignment</Link>
      <PageHead
        eyebrow="Change requests"
        title={<span className="block max-w-[760px] break-words">{current.errand.title}</span>}
        description="Propose a change to the agreed terms. The other party must accept it before it takes effect."
      />
      <JourneyHere />
      {payment.error ? <ApiError error={payment.error} fallback="We could not load the current payment agreement." onRetry={() => void payment.refetch()} /> : null}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-4">
          {!pending && !canPropose ? (
            <Alert variant="info" role="status">
              <p className="font-extrabold">New change requests are closed</p>
              <p className="mt-1">Amount, address and time can only be changed before pickup. If something is wrong now, open a dispute from the assignment page.</p>
            </Alert>
          ) : null}
          {pending && canPropose ? (
            <Alert variant="info" role="status">A change request is waiting for a response. You can propose another once it is answered.</Alert>
          ) : null}
          {!pending && canPropose ? (
            <section className="grid min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] gap-4" aria-labelledby="propose-change">
              <div className="border-b border-line-2 pb-4">
                <h2 id="propose-change" className="text-base font-extrabold text-ink">Propose a change</h2>
                <p className="mt-1 text-xs text-muted">Only one change request may be pending at a time.</p>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-ink-2" htmlFor="change-type">Change type</label>
                <Select value={type} onValueChange={(value) => setType(value as ChangeType)}>
                  <SelectTrigger id="change-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{changeTypes.filter((option) => option !== 'TIME' || isScheduled).map((option) => <SelectItem key={option} value={option}>{label(option)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {type === 'AMOUNT' ? (
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-ink-2" htmlFor="change-amount">New runner fee</label>
                  <MoneyInput id="change-amount" value={amountMinor} onChange={setAmountMinor} placeholder="e.g. 5,500" autoComplete="off" />
                </div>
              ) : null}
              {type === 'PICKUP' || type === 'DESTINATION' ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <label className="text-xs font-bold text-ink-2" htmlFor="change-lat">Latitude</label>
                      <Input id="change-lat" type="number" min={-90} max={90} step="any" value={lat} onChange={(event) => setLat(event.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-bold text-ink-2" htmlFor="change-lng">Longitude</label>
                      <Input id="change-lng" type="number" min={-180} max={180} step="any" value={lng} onChange={(event) => setLng(event.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-bold text-ink-2" htmlFor="change-address">Address details <span className="font-normal text-muted">(optional)</span></label>
                    <Input id="change-address" value={address} onChange={(event) => setAddress(event.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-bold text-ink-2" htmlFor="change-landmark">Landmark <span className="font-normal text-muted">(optional)</span></label>
                    <Input id="change-landmark" value={landmark} onChange={(event) => setLandmark(event.target.value)} />
                  </div>
                </>
              ) : null}
              {type === 'TIME' ? (
                <LagosDateTimeField id="change-scheduled-at" label="New scheduled time" value={scheduledAt || null} onChange={(value) => setScheduledAt(value ?? '')} minLeadMinutes={0} />
              ) : null}
              {type === 'OTHER' ? (
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-ink-2" htmlFor="change-other">Explain the requested change</label>
                  <Textarea id="change-other" maxLength={500} value={other} onChange={(event) => setOther(event.target.value)} />
                </div>
              ) : null}
              {create.error ? <ApiError error={create.error} fallback="We could not propose this change." /> : null}
              {create.isSuccess ? <Alert variant="ok" role="status">Change request sent. The other party has until the expiry time to answer.</Alert> : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-2 pt-4">
                <p className="max-w-md text-xs text-muted">The other party must respond before the expiry time or pickup, whichever comes first.</p>
                <Button type="button" disabled={!payload || create.isPending} onClick={() => payload && create.mutate(payload)}>
                  {create.isPending ? 'Sending…' : 'Send change request'}
                </Button>
              </div>
            </section>
          ) : null}
        </div>
        {history}
      </div>
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
