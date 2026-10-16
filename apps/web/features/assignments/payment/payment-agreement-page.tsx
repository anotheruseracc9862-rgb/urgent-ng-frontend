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

type PaymentMethod = NonNullable<components['schemas']['PaymentAgreementDto']['paymentMethod']>;
type PaymentTiming = NonNullable<components['schemas']['PaymentAgreementDto']['paymentTiming']>;

const methods: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'MOBILE_TRANSFER', 'OTHER'];
const timings: PaymentTiming[] = ['BEFORE_PICKUP', 'AT_PICKUP', 'AFTER_PICKUP', 'AT_DELIVERY', 'AFTER_DELIVERY', 'OTHER'];

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(minor: number, currency: string) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(minor / 100);
}

export function PaymentAgreementPage({ assignmentId }: { assignmentId: string }) {
  const client = useQueryClient();
  const agreementKey = queryKeys.assignments.paymentAgreement(assignmentId);
  const agreement = useQuery({
    queryKey: agreementKey,
    queryFn: () => offersApi.paymentAgreement(assignmentId),
    retry: false,
  });
  const assignment = useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId),
    queryFn: () => offersApi.assignment(assignmentId),
    retry: false,
  });
  const [methodDraft, setMethodDraft] = useState<PaymentMethod | ''>('');
  const [timingDraft, setTimingDraft] = useState<PaymentTiming | ''>('');
  const update = useApiMutation({ affects: ['assignments'],
    mutationFn: (input: components['schemas']['UpdatePaymentAgreementDto']) => offersApi.updatePaymentAgreement(assignmentId, input),
    onSuccess: (result) => {
      client.setQueryData(agreementKey, result);
      setMethodDraft('');
      setTimingDraft('');
    },
  });

  if (agreement.isPending || assignment.isPending) {
    return <PageLoading title="Payment agreement" eyebrow="Assignment" width="max-w-3xl" />;
  }
  if (agreement.error || !agreement.data || assignment.error || !assignment.data) {
    const error = agreement.error ?? assignment.error;
    return (
      <main className="mx-auto max-w-3xl">
        <ApiError error={error} fallback="We could not load this payment agreement." onRetry={() => { void agreement.refetch(); void assignment.refetch(); }} />
      </main>
    );
  }

  const current = agreement.data;
  const role = assignment.data.data.role;
  const method = methodDraft || current.paymentMethod || '';
  const timing = timingDraft || current.paymentTiming || '';
  const confirmedAt = role === 'REQUESTER' ? current.confirmedByRequesterAt : current.confirmedByRunnerAt;
  const otherConfirmedAt = role === 'REQUESTER' ? current.confirmedByRunnerAt : current.confirmedByRequesterAt;

  return (
    <main className="mx-auto grid max-w-3xl gap-4">
      <Link href={`/assignments/${assignmentId}`} className="w-fit text-sm font-bold text-green-800 hover:underline">← Back to assignment</Link>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wide text-green-800">Payment agreement</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{assignment.data.data.errand.title}</h1>
      </header>
      <Alert variant="warn" role="note">
        <p>Urgent.ng never holds or transfers this money. The payment is arranged directly between the requester and runner.</p>
      </Alert>
      <section className="grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <div className="rounded-xl bg-panel p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted">Agreed runner fee · read-only</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{money(current.agreedAmountMinor, current.currency)}</p>
        </div>
        <label className="grid gap-1 text-sm font-bold text-ink">Payment method
          <select value={method} onChange={(event) => setMethodDraft(event.target.value as PaymentMethod)} className="rounded-lg border border-line bg-panel p-3 font-normal">
            <option value="">Choose a method</option>
            {methods.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink">Payment timing
          <select value={timing} onChange={(event) => setTimingDraft(event.target.value as PaymentTiming)} className="rounded-lg border border-line bg-panel p-3 font-normal">
            <option value="">Choose timing</option>
            {timings.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
        {methodDraft && methodDraft !== current.paymentMethod || timingDraft && timingDraft !== current.paymentTiming ? (
          <p className="text-sm text-amber-900">Saving changed payment terms clears both parties&apos; confirmations. Both parties will need to confirm the updated agreement.</p>
        ) : null}
        {update.error ? <ApiError error={update.error} fallback="We could not update the payment agreement." /> : null}
        {update.isSuccess ? <Alert variant="ok" role="status">Payment terms updated. Both confirmations were refreshed by the server.</Alert> : null}
        <Button
          type="button"
          variant="ghost"
          className="w-fit"
          disabled={!method || !timing || update.isPending || (method === current.paymentMethod && timing === current.paymentTiming)}
          onClick={() => update.mutate({ paymentMethod: method as PaymentMethod, paymentTiming: timing as PaymentTiming })}
        >
          {update.isPending ? 'Saving…' : 'Save payment terms'}
        </Button>
      </section>
      <section className="grid gap-2 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <h2 className="font-extrabold text-ink">Confirmations</h2>
        <p className="text-sm text-ink-2">You ({label(role)}): {confirmedAt ? `confirmed ${new Date(confirmedAt).toLocaleString()}` : 'not confirmed'}</p>
        <p className="text-sm text-ink-2">Other party: {otherConfirmedAt ? `confirmed ${new Date(otherConfirmedAt).toLocaleString()}` : 'not confirmed'}</p>
        <p role="status" className="text-sm font-bold text-ink">{current.fullyConfirmed ? 'Both parties confirmed these terms.' : 'Waiting for both parties to confirm the current terms.'}</p>
        {confirmedAt ? null : (
          <Button type="button" className="w-fit" disabled={!current.paymentMethod || !current.paymentTiming || update.isPending} onClick={() => update.mutate({ confirm: true })}>
            {update.isPending ? 'Confirming…' : 'Confirm payment agreement'}
          </Button>
        )}
      </section>
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
