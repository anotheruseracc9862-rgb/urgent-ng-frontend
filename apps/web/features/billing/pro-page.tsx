'use client';

import { PageHead } from '@/components/shell/page-head';
import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate, formatMoney } from '@urgent/utils';
import { queryKeys } from '@/lib/query/keys';
import { billingApi, productFor, type ProSubscription } from './api';
import { billingErrorMessage } from './messages';
import { useIntentKey } from './use-intent-key';
import { useContinueToCheckout } from './use-checkout';

const GIVES = [
  'A much higher daily limit on new offers than free accounts',
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


const DAY_MS = 86_400_000;

/**
 * Every Runner Pro payment as a card, with the stretch of time it covers. Payments stack the way the
 * backend stacks them: one made while Pro is still running starts when the current period ends.
 */
function ProPurchases({ periodDays, subscription }: { periodDays: number; subscription: ProSubscription }) {
  const [now] = React.useState(() => Date.now());
  const orders = useQuery({ queryKey: [...queryKeys.billing.orders(), 'pro-page'], queryFn: () => billingApi.orders() });
  const list = Array.isArray(orders.data?.data) ? orders.data.data : [];
  const pro = list.filter((order) => order.type === 'RUNNER_PRO' && (order.status === 'PAID' || order.status === 'REFUNDED'));
  if (orders.isPending || !pro.length) return null;

  const byPaid = [...pro].filter((order) => order.status === 'PAID' && order.paidAt).sort((a, b) => Date.parse(a.paidAt!) - Date.parse(b.paidAt!));
  const spans = new Map<string, { start: number; end: number }>();
  let previousEnd = 0;
  for (const order of byPaid) {
    const start = Math.max(Date.parse(order.paidAt!), previousEnd);
    const end = start + periodDays * DAY_MS;
    spans.set(order.id, { start, end });
    previousEnd = end;
  }
  const cards = [...pro].sort((a, b) => Date.parse(b.paidAt ?? b.createdAt) - Date.parse(a.paidAt ?? a.createdAt));

  return (
    <section aria-labelledby="pro-purchases" className="grid min-w-0 gap-3">
      <div className="flex items-end justify-between gap-3 px-1.5">
        <h2 id="pro-purchases" className="text-base font-extrabold text-ink">Your Runner Pro purchases</h2>
        <Link href="/profile/orders" className="text-xs font-bold text-green-800 underline">All orders</Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((order) => {
          const span = spans.get(order.id);
          const refunded = order.status === 'REFUNDED';
          const state = refunded ? 'Refunded'
            : !span ? 'Paid'
            : span.end <= now ? 'Ended'
            : span.start > now ? 'Starts later'
            : subscription.active ? 'Active now' : 'Ended';
          const tone = state === 'Active now' ? 'bg-tint-2 text-green-900' : state === 'Starts later' ? 'bg-blue-bg text-blue' : 'bg-panel text-ink-2';
          return (
            <li key={order.id} className="grid min-w-0 gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-extrabold text-ink">{formatMoney(order.amountMinor)}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${tone}`}>{state}</span>
              </div>
              <dl className="grid gap-1.5 text-xs text-muted">
                {span && !refunded ? (
                  <div className="flex justify-between gap-3"><dt>Covers</dt><dd className="text-right font-bold text-ink-2">{formatDate(new Date(span.start).toISOString(), 'medium')} – {formatDate(new Date(span.end).toISOString(), 'medium')}</dd></div>
                ) : null}
                <div className="flex justify-between gap-3"><dt>Paid</dt><dd className="text-right font-bold text-ink-2">{order.paidAt ? formatDate(order.paidAt, 'medium') : '—'}</dd></div>
              </dl>
              <Link href={`/checkout/${order.id}`} className="text-xs font-bold text-green-800 underline">View receipt</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
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

  const buy = useApiMutation({ affects: ['billing'],
    mutationFn: () => billingApi.createOrder('RUNNER_PRO', intent.keyFor(`pro:${autoRenew}`), autoRenew),
    onSuccess: (order) => {
      intent.reset();
      continueToCheckout(order);
    },
  });
  const cancel = useApiMutation({ affects: ['billing'],
    mutationFn: billingApi.cancelPro,
    onSuccess: (next) => {
      setConfirmCancel(false);
      client.setQueryData(queryKeys.billing.subscription(), next);
    },
  });

  if (pro.isPending || products.isPending) {
    return <PageLoading title="Do more errands, every day" eyebrow="Runner Pro" />;
  }
  if (pro.error || !pro.data) {
    return (
      <div className="grid min-w-0 gap-3">
        <Alert variant="danger" role="alert">
          <p>We could not load your Runner Pro status.</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => void pro.refetch()}>Try again</Button>
        </Alert>
      </div>
    );
  }

  const sub = pro.data;
  const canBuy = !sub.active || sub.status === 'PAYMENT_FAILED' || sub.status === 'GRACE_PERIOD' || sub.status === 'CANCELLED';
  const canCancel = sub.active && sub.status !== 'CANCELLED' && sub.status !== 'EXPIRED';

  const card = 'min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]';

  return (
    <div className="grid min-w-0 gap-4">
      <PageHead eyebrow="Runner Pro" title="Do more errands, every day" />

      <ProStatusBanner pro={sub} />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${card} grid gap-5`} aria-label="What Runner Pro includes">
          <div aria-labelledby="pro-gives" role="group">
            <h2 id="pro-gives" className="text-sm font-extrabold text-ink">What Pro gives you</h2>
            <ul className="mt-2 grid gap-1.5 text-sm text-ink-2">{GIVES.map((text) => <li key={text}>{text}</li>)}</ul>
          </div>
          <div aria-labelledby="pro-not" role="group" className="border-t border-line pt-5">
            <h2 id="pro-not" className="text-sm font-extrabold text-ink">What Pro does not give</h2>
            <ul className="mt-2 grid gap-1.5 text-sm text-ink-2">{DOES_NOT_GIVE.map((text) => <li key={text}>{text}</li>)}</ul>
          </div>
        </section>

        <div className="grid min-w-0 gap-4">
          {canBuy ? (
            <section className={`${card} grid gap-3`} aria-labelledby="pro-buy">
              <h2 id="pro-buy" className="text-sm font-extrabold text-ink">{sub.active ? 'Pay for the next period' : 'Start Runner Pro'}</h2>
              {product ? (
                <p className="text-sm text-ink-2">
                  <strong className="text-lg text-ink">{formatMoney(product.priceMinor)}</strong>
                  {product.periodDays ? ` for ${product.periodDays} days` : ''}
                </p>
              ) : <p role="status" className="text-sm text-muted">The price is not available right now.</p>}
              <label className="flex items-start gap-3 text-sm text-ink-2">
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
                </Alert>
              ) : null}
              <Button type="button" className="w-full" disabled={buy.isPending || !product} onClick={() => buy.mutate()}>
                {buy.isPending ? 'Starting payment…' : 'Continue to payment'}
              </Button>
            </section>
          ) : null}

          {canCancel ? (
            <section className={`${card} grid gap-3`} aria-labelledby="pro-cancel">
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
                <Button type="button" variant="ghost" onClick={() => setConfirmCancel(true)}>Cancel Runner Pro</Button>
              )}
            </section>
          ) : null}
        </div>
      </div>

      <ProPurchases periodDays={product?.periodDays ?? 30} subscription={sub} />
    </div>
  );
}
