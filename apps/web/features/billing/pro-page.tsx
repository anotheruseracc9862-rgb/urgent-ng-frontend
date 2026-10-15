'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate, formatMoney } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { billingApi, productFor, type ProSubscription } from './api';
import { billingErrorMessage } from './messages';
import { useIntentKey } from './use-intent-key';
import { useContinueToCheckout } from './use-checkout';

const GIVES = [
  'Unlimited new offers each day (free accounts get a daily limit)',
  'Early access to newly posted errands',
  'A Pro badge on your profile',
];

const DOES_NOT_GIVE = [
  'It does not replace identity verification. You still verify before sending offers.',
  'It does not guarantee a requester picks you.',
  'Urgent.ng never holds errand money. Requesters pay you directly.',
];

function when(value: string | null | undefined): string {
  return value ? formatDate(value, 'long') : 'the end of the period';
}

export function ProStatusBanner({ pro }: { pro: ProSubscription }) {
  switch (pro.status) {
    case 'TRIAL':
      return <Alert variant="lime" role="status"><p><strong>Pro trial.</strong> Your benefits run until {when(pro.currentPeriodEnd)}.</p></Alert>;
    case 'ACTIVE':
      return (
        <Alert variant="ok" role="status">
          <p><strong>Runner Pro is active.</strong> {pro.autoRenew
            ? `It renews on ${when(pro.currentPeriodEnd)}.`
            : `It ends on ${when(pro.currentPeriodEnd)} and will not renew.`}</p>
        </Alert>
      );
    case 'PENDING_RENEWAL':
      return <Alert variant="info" role="status"><p><strong>Renewing.</strong> We are confirming your renewal payment. Your benefits continue meanwhile.</p></Alert>;
    case 'PAYMENT_FAILED':
    case 'GRACE_PERIOD':
      return (
        <Alert variant="warn" role="status">
          <p><strong>Your renewal payment failed.</strong> Your benefits continue until {when(pro.graceEndsAt)}. Pay again below to keep Pro.</p>
        </Alert>
      );
    case 'CANCELLED':
      return (
        <Alert variant="info" role="status">
          <p><strong>Runner Pro is cancelled.</strong> {pro.active
            ? `You keep your benefits until ${when(pro.currentPeriodEnd)}.`
            : 'Your benefits have ended.'}</p>
        </Alert>
      );
    case 'EXPIRED':
      return <Alert variant="default" role="status"><p><strong>Runner Pro has ended.</strong> You can start it again below.</p></Alert>;
    default:
      return null;
  }
}

export function ProPage() {
  const client = useQueryClient();
  const intent = useIntentKey();
  const continueToCheckout = useContinueToCheckout();
  const [autoRenew, setAutoRenew] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  const pro = useQuery({ queryKey: queryKeys.billing.subscription(), queryFn: billingApi.pro });
  const products = useQuery({ queryKey: queryKeys.billing.products(), queryFn: billingApi.products });
  const product = productFor(products.data, 'RUNNER_PRO');

  const buy = useMutation({
    mutationFn: () => billingApi.createOrder('RUNNER_PRO', intent.keyFor(`pro:${autoRenew}`), autoRenew),
    onSuccess: (order) => {
      intent.reset();
      continueToCheckout(order);
    },
  });
  const cancel = useMutation({
    mutationFn: billingApi.cancelPro,
    onSuccess: (next) => {
      setConfirmCancel(false);
      client.setQueryData(queryKeys.billing.subscription(), next);
    },
  });

  if (pro.isLoading || products.isLoading) {
    return <div className="mx-auto grid max-w-3xl gap-3" aria-label="Loading Runner Pro"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  }
  if (pro.error || !pro.data) {
    return (
      <div className="mx-auto grid max-w-3xl gap-3">
        <Alert variant="danger" role="alert">
          <p>We could not load your Runner Pro status.</p>
          {isApiError(pro.error) && pro.error.requestId ? <p className="mt-1 text-xs">Request ID: {pro.error.requestId}</p> : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => void pro.refetch()}>Try again</Button>
        </Alert>
      </div>
    );
  }

  const sub = pro.data;
  const canBuy = !sub.active || sub.status === 'PAYMENT_FAILED' || sub.status === 'GRACE_PERIOD' || sub.status === 'CANCELLED';
  const canCancel = sub.active && sub.status !== 'CANCELLED' && sub.status !== 'EXPIRED';

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Runner Pro</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Do more errands, every day</h1>
      </header>

      <ProStatusBanner pro={sub} />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]" aria-labelledby="pro-gives">
          <h2 id="pro-gives" className="text-sm font-extrabold text-ink">What Pro gives you</h2>
          <ul className="mt-3 grid gap-2 text-sm text-ink-2">{GIVES.map((text) => <li key={text}>{text}</li>)}</ul>
        </section>
        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]" aria-labelledby="pro-not">
          <h2 id="pro-not" className="text-sm font-extrabold text-ink">What Pro does not give</h2>
          <ul className="mt-3 grid gap-2 text-sm text-ink-2">{DOES_NOT_GIVE.map((text) => <li key={text}>{text}</li>)}</ul>
        </section>
      </div>

      {canBuy ? (
        <section className="grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5" aria-labelledby="pro-buy">
          <h2 id="pro-buy" className="text-sm font-extrabold text-ink">{sub.active ? 'Pay for the next period' : 'Start Runner Pro'}</h2>
          {product ? (
            <p className="text-sm text-ink-2">
              <strong className="text-lg text-ink">{formatMoney(product.priceMinor)}</strong>
              {product.periodDays ? ` for ${product.periodDays} days` : ''}. Includes {formatMoney(product.vatMinor)} VAT.
            </p>
          ) : <p role="status" className="text-sm text-muted">The price is not available right now.</p>}
          <label className="flex min-h-11 items-start gap-3 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(event) => setAutoRenew(event.currentTarget.checked)}
              className="mt-0.5 size-4 accent-lime-700"
            />
            <span>Renew automatically with the card I pay with. I can cancel at any time.</span>
          </label>
          {buy.error ? (
            <Alert variant="danger" role="alert">
              <p>{billingErrorMessage(buy.error)}</p>
              {isApiError(buy.error) && buy.error.requestId ? <p className="mt-1 text-xs">Request ID: {buy.error.requestId}</p> : null}
            </Alert>
          ) : null}
          <div>
            <Button type="button" disabled={buy.isPending || !product} onClick={() => buy.mutate()}>
              {buy.isPending ? 'Starting payment…' : 'Continue to payment'}
            </Button>
          </div>
        </section>
      ) : null}

      {canCancel ? (
        <section className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5" aria-labelledby="pro-cancel">
          <h2 id="pro-cancel" className="text-sm font-extrabold text-ink">Cancel Runner Pro</h2>
          <p className="text-sm text-muted">You keep your benefits until {when(sub.currentPeriodEnd)}. It will not renew.</p>
          {cancel.error ? <Alert variant="danger" role="alert"><p>{billingErrorMessage(cancel.error)}</p></Alert> : null}
          {confirmCancel ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                {cancel.isPending ? 'Cancelling…' : 'Yes, cancel Pro'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmCancel(false)}>Keep Pro</Button>
            </div>
          ) : (
            <div><Button type="button" variant="ghost" onClick={() => setConfirmCancel(true)}>Cancel Runner Pro</Button></div>
          )}
        </section>
      ) : null}
    </div>
  );
}
