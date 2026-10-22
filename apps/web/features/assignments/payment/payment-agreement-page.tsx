'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { PageHead } from '@/components/shell/page-head';
import { ArrowLeft } from 'lucide-react';
import { Alert, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { PAYMENT_TIMING_LABEL, flowOf } from '@/features/reference/flow';
import { JourneyHere } from '@/features/journey/journey-context';

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
  const router = useRouter();
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
    onSuccess: (result, input) => {
      client.setQueryData(agreementKey, result);
      setMethodDraft('');
      setTimingDraft('');
      // Confirming is the last step here; saving terms keeps the person on the page to confirm next.
      if (input.confirm) router.push(`/assignments/${assignmentId}`);
    },
  });

  if (agreement.isPending || assignment.isPending) {
    return <PageLoading title="Payment agreement" eyebrow="Assignment" width="max-w-5xl" />;
  }
  if (agreement.error || !agreement.data || assignment.error || !assignment.data) {
    const error = agreement.error ?? assignment.error;
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
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

  const termsChanged = Boolean((methodDraft && methodDraft !== current.paymentMethod) || (timingDraft && timingDraft !== current.paymentTiming));

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={`/assignments/${assignmentId}`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />Back to assignment</Link>
      <PageHead
        eyebrow="Payment agreement"
        title={<span className="block max-w-[760px] break-words">{assignment.data.data.errand.title}</span>}
        description="Agree how and when the runner fee is paid. Both sides confirm the same terms."
      />
      <JourneyHere />
      <Alert variant="warn" role="note">
        <p>Urgent.ng never holds or transfers this money. The payment is arranged directly between the requester and runner.</p>
      </Alert>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid min-w-0 gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]" aria-labelledby="payment-terms">
          <div className="border-b border-line-2 pb-4">
            <h2 id="payment-terms" className="text-base font-extrabold text-ink">Payment terms</h2>
            <p className="mt-1 text-xs text-muted">Choose how the fee is paid and when.</p>
          </div>
          <div className="rounded-[var(--r)] bg-tint p-4">
            <p className="text-xs font-semibold text-green-900">Agreed runner fee · read-only</p>
            <p className="mt-2 break-words text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-ink">{money(current.agreedAmountMinor, current.currency)}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 content-start gap-1.5">
              <label className="text-xs font-bold text-ink-2" htmlFor="payment-method">Payment method</label>
              <Select value={method || undefined} onValueChange={(value) => setMethodDraft(value as PaymentMethod)}>
                <SelectTrigger id="payment-method" className="min-w-0"><SelectValue placeholder="Choose a method" /></SelectTrigger>
                <SelectContent>{methods.map((item) => <SelectItem key={item} value={item}>{label(item)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 content-start gap-1.5">
              <label className="text-xs font-bold text-ink-2" htmlFor="payment-timing">Payment timing</label>
              <Select value={timing || undefined} onValueChange={(value) => setTimingDraft(value as PaymentTiming)}>
                <SelectTrigger id="payment-timing" className="min-w-0"><SelectValue placeholder="Choose timing" /></SelectTrigger>
                <SelectContent>{timings.map((item) => <SelectItem key={item} value={item}>{PAYMENT_TIMING_LABEL[flowOf(assignment.data.data.errand.category)][item] ?? label(item)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {termsChanged ? (
            <Alert variant="warn" role="status">Saving changed payment terms clears both parties&apos; confirmations. Both parties will need to confirm the updated agreement.</Alert>
          ) : null}
          {update.error ? <ApiError error={update.error} fallback="We could not update the payment agreement." /> : null}
          {update.isSuccess ? <Alert variant="ok" role="status">Payment terms updated. Both confirmations were refreshed by the server.</Alert> : null}
          <div className="flex justify-end border-t border-line-2 pt-4">
            <Button
              type="button"
              disabled={!method || !timing || update.isPending || (method === current.paymentMethod && timing === current.paymentTiming)}
              onClick={() => update.mutate({ paymentMethod: method as PaymentMethod, paymentTiming: timing as PaymentTiming })}
            >
              {update.isPending ? 'Saving…' : 'Save payment terms'}
            </Button>
          </div>
        </section>
        <aside aria-labelledby="payment-confirmations" className="grid min-w-0 content-start gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] lg:sticky lg:top-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="payment-confirmations" className="text-sm font-extrabold text-ink">Confirmations</h2>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${current.fullyConfirmed ? 'bg-ok-bg text-ok' : 'bg-amber-bg text-amber'}`}>{current.fullyConfirmed ? 'Both confirmed' : 'Waiting'}</span>
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="rounded-[var(--r-sm)] bg-panel p-3"><dt className="text-xs font-bold text-muted">You ({label(role)})</dt><dd className="mt-1 font-semibold text-ink">{confirmedAt ? `Confirmed ${new Date(confirmedAt).toLocaleString()}` : 'Not confirmed'}</dd></div>
            <div className="rounded-[var(--r-sm)] bg-panel p-3"><dt className="text-xs font-bold text-muted">Other party</dt><dd className="mt-1 font-semibold text-ink">{otherConfirmedAt ? `Confirmed ${new Date(otherConfirmedAt).toLocaleString()}` : 'Not confirmed'}</dd></div>
          </dl>
          <p role="status" className="text-xs leading-relaxed text-muted">{current.fullyConfirmed ? 'Both parties confirmed these terms.' : 'Waiting for both parties to confirm the current terms.'}</p>
          {confirmedAt ? null : (
            <Button type="button" disabled={!current.paymentMethod || !current.paymentTiming || update.isPending} onClick={() => update.mutate({ confirm: true })}>
              {update.isPending ? 'Confirming…' : 'Confirm payment agreement'}
            </Button>
          )}
        </aside>
      </div>
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
