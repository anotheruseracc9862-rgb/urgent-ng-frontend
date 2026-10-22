'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { HandCoins } from 'lucide-react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@urgent/ui';
import { useApiMutation } from '@/lib/query/mutations';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import type { AssignmentRole } from '../available-actions';
import { paymentPrompt } from './payment-prompt';
import { PAYMENT_TIMING_LABEL, flowOf } from '@/features/reference/flow';

type PaymentMethod = NonNullable<components['schemas']['PaymentAgreementDto']['paymentMethod']>;
type PaymentTiming = NonNullable<components['schemas']['PaymentAgreementDto']['paymentTiming']>;

const methods: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'MOBILE_TRANSFER', 'OTHER'];
const timings: PaymentTiming[] = ['BEFORE_PICKUP', 'AT_PICKUP', 'AFTER_PICKUP', 'AT_DELIVERY', 'AFTER_DELIVERY', 'OTHER'];
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * Sets and confirms the payment terms without leaving the chat. Shown only while this person has
 * something to do (or the requester has not set terms yet); it never blocks sending a message.
 */
export function PaymentTermsStrip({ assignmentId, role }: { assignmentId: string; role: AssignmentRole }) {
  const client = useQueryClient();
  const key = queryKeys.assignments.paymentAgreement(assignmentId);
  const agreement = useQuery({ queryKey: key, queryFn: () => offersApi.paymentAgreement(assignmentId), retry: false });
  const assignment = useQuery({ queryKey: queryKeys.assignments.detail(assignmentId), queryFn: () => offersApi.assignment(assignmentId), retry: false });
  const flow = flowOf(assignment.data?.data.errand.category);
  const [methodDraft, setMethodDraft] = useState<PaymentMethod | ''>('');
  const [timingDraft, setTimingDraft] = useState<PaymentTiming | ''>('');
  const update = useApiMutation({
    affects: ['assignments'],
    mutationFn: (input: components['schemas']['UpdatePaymentAgreementDto']) => offersApi.updatePaymentAgreement(assignmentId, input),
    onSuccess: (result) => {
      client.setQueryData(key, result);
      setMethodDraft('');
      setTimingDraft('');
    },
  });

  if (!agreement.data) return null;
  const current = agreement.data;
  const prompt = paymentPrompt(role, current);
  if (prompt.step === 'DONE' || prompt.step === 'WAIT_FOR_OTHER') return null;

  const method = methodDraft || current.paymentMethod || '';
  const timing = timingDraft || current.paymentTiming || '';
  const termsSet = Boolean(current.paymentMethod && current.paymentTiming);
  const dirty = method !== (current.paymentMethod ?? '') || timing !== (current.paymentTiming ?? '');
  const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: current.currency || 'NGN', maximumFractionDigits: 0 }).format(current.agreedAmountMinor / 100);

  return (
    <section aria-label="Payment agreement" className="grid gap-3 rounded-[var(--r)] bg-tint p-3.5">
      <div className="flex items-start gap-2.5">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-green-900"><HandCoins className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">{prompt.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-green-900">
            {prompt.message} The fee is {money}.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={method || undefined} onValueChange={(value) => setMethodDraft(value as PaymentMethod)}>
          <SelectTrigger aria-label="Payment method" className="min-w-0 bg-surface"><SelectValue placeholder="Method" /></SelectTrigger>
          <SelectContent>{methods.map((item) => <SelectItem key={item} value={item}>{label(item)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={timing || undefined} onValueChange={(value) => setTimingDraft(value as PaymentTiming)}>
          <SelectTrigger aria-label="Payment timing" className="min-w-0 bg-surface"><SelectValue placeholder="When" /></SelectTrigger>
          <SelectContent>{timings.map((item) => <SelectItem key={item} value={item}>{PAYMENT_TIMING_LABEL[flow][item] ?? label(item)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {update.error ? <p role="alert" className="text-xs font-semibold text-red">{isApiError(update.error) ? update.error.message : 'We could not update the payment terms.'}</p> : null}
      <div className="flex flex-wrap gap-2">
        {dirty ? (
          <Button type="button" size="sm" disabled={!method || !timing || update.isPending} onClick={() => update.mutate({ paymentMethod: method as PaymentMethod, paymentTiming: timing as PaymentTiming })}>
            {update.isPending ? 'Saving…' : 'Save terms'}
          </Button>
        ) : termsSet ? (
          <Button type="button" size="sm" disabled={update.isPending} onClick={() => update.mutate({ confirm: true })}>
            {update.isPending ? 'Confirming…' : 'Confirm terms'}
          </Button>
        ) : null}
      </div>
      {dirty && termsSet ? <p className="text-[11px] text-muted">Changing saved terms clears both confirmations.</p> : null}
    </section>
  );
}
