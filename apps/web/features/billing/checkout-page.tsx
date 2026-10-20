'use client';

import { PageLoading } from '@/components/shell/page-loading';
import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button } from '@urgent/ui';
import { formatDate, formatMoney } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { billingApi, ORDER_TYPE_LABEL, type Order } from './api';
import { clearPendingOrder } from './checkout';

const POLL_MS = 3_000;
const POLL_WINDOW_MS = 60_000;

interface CheckedOrder {
  order: Order;
  /** The gateway could not be asked this time, so the state may be behind. */
  providerUnavailable: boolean;
}

function nextLink(order: Order): { href: string; label: string } {
  switch (order.type) {
    case 'RUNNER_PRO':
      return { href: '/pro', label: 'View Runner Pro' };
    case 'BOOST':
      return order.errandId
        ? { href: `/errands/${encodeURIComponent(order.errandId)}`, label: 'Back to your errand' }
        : { href: '/errands', label: 'My errands' };
    default:
      return { href: '/verification', label: 'Continue verification' };
  }
}

function retryLink(order: Order): { href: string; label: string } {
  switch (order.type) {
    case 'RUNNER_PRO':
      return { href: '/pro', label: 'Try Runner Pro again' };
    case 'BOOST':
      return { href: order.errandId ? `/boosts?errandId=${encodeURIComponent(order.errandId)}` : '/boosts', label: 'Try the boost again' };
    default:
      return { href: '/verification', label: 'Back to verification' };
  }
}

/** The page never grants anything: it asks the backend to verify and shows what the backend says. */
export function CheckoutPage({ orderId }: { orderId: string }) {
  const client = useQueryClient();
  const startedAt = React.useRef<number | null>(null);
  const [waitedOut, setWaitedOut] = React.useState(false);

  React.useEffect(() => {
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => setWaitedOut(true), POLL_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const checked = useQuery<CheckedOrder>({
    queryKey: queryKeys.billing.order(orderId),
    queryFn: async () => {
      const current = await billingApi.order(orderId);
      if (current.status !== 'PENDING') return { order: current, providerUnavailable: false };
      try {
        return { order: await billingApi.verify(orderId), providerUnavailable: false };
      } catch (error) {
        if (isApiError(error) && error.code === 'PAYMENT_PROVIDER_UNAVAILABLE') {
          return { order: current, providerUnavailable: true };
        }
        return { order: current, providerUnavailable: false };
      }
    },
    refetchInterval: (query) => {
      const status = query.state.data?.order.status;
      const started = startedAt.current;
      return status === 'PENDING' && started !== null && Date.now() - started < POLL_WINDOW_MS ? POLL_MS : false;
    },
  });

  const status = checked.data?.order.status;
  React.useEffect(() => {
    if (!status || status === 'PENDING') return;
    clearPendingOrder();
    void client.invalidateQueries({ queryKey: queryKeys.billing.orders() });
    if (status === 'PAID') {
      void client.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
      void client.invalidateQueries({ queryKey: ['verification'] });
      void client.invalidateQueries({ queryKey: queryKeys.errands.all() });
      void client.invalidateQueries({ queryKey: queryKeys.marketplace.all() });
    }
  }, [status, client]);

  if (checked.isPending) {
    return <PageLoading title="Payment" eyebrow="Billing" width="max-w-xl" />;
  }
  if (checked.error || !checked.data) {
    const notFound = isApiError(checked.error) && checked.error.status === 404;
    return (
      <div className="mx-auto grid max-w-xl gap-3">
        <Alert variant="danger" role="alert">
          <p>{notFound ? 'We could not find this order.' : 'We could not load this order.'}</p>
          {!notFound ? <Button type="button" variant="ghost" size="sm" onClick={() => void checked.refetch()}>Try again</Button> : null}
        </Alert>
        <Link href="/profile/orders" className="text-sm font-bold text-green-800 underline">See your orders</Link>
      </div>
    );
  }

  const { order, providerUnavailable } = checked.data;
  const stillChecking = order.status === 'PENDING' && !waitedOut;

  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Payment</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{ORDER_TYPE_LABEL[order.type]}</h1>
      </header>

      {order.status === 'PAID' ? (
        <Alert variant="ok" role="status">
          <p><strong>Payment received.</strong> {order.paidAt ? `Paid on ${formatDate(order.paidAt, 'medium')}.` : ''}</p>
        </Alert>
      ) : null}
      {order.status === 'PENDING' && stillChecking ? (
        <Alert variant="info" role="status">
          <p><strong>Checking your payment…</strong> {providerUnavailable
            ? 'The payment service is slow to answer. We will keep trying.'
            : 'This usually takes a few seconds.'}</p>
        </Alert>
      ) : null}
      {order.status === 'PENDING' && waitedOut ? (
        <Alert variant="warn" role="status">
          <p><strong>Still waiting for confirmation.</strong> If you paid, it will show here once the bank confirms. You can close this page and come back to your orders later.</p>
          <div className="mt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { startedAt.current = Date.now(); setWaitedOut(false); void checked.refetch(); }}>Check again</Button>
          </div>
        </Alert>
      ) : null}
      {order.status === 'FAILED' || order.status === 'CANCELLED' ? (
        <Alert variant="danger" role="alert">
          <p><strong>{order.status === 'FAILED' ? 'The payment did not go through.' : 'This order was cancelled.'}</strong> You have not been charged for it.</p>
        </Alert>
      ) : null}
      {order.status === 'REFUNDED' ? (
        <Alert variant="info" role="status"><p><strong>This payment was refunded.</strong></p></Alert>
      ) : null}

      <dl className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 text-sm shadow-[var(--shadow)]">
        <div className="flex justify-between gap-3"><dt className="text-muted">Item</dt><dd className="font-bold text-ink">{ORDER_TYPE_LABEL[order.type]}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">VAT included</dt><dd className="font-bold text-ink">{formatMoney(order.vatMinor)}</dd></div>
        <div className="flex justify-between gap-3 border-t border-line pt-3"><dt className="text-muted">Total</dt><dd className="font-extrabold text-ink">{formatMoney(order.amountMinor)}</dd></div>
      </dl>

      <div className="flex flex-wrap gap-3">
        {order.status === 'PAID' ? (
          <Link href={nextLink(order).href} className="inline-flex min-h-11 items-center rounded-full bg-green-800 px-5 text-sm font-bold text-white">{nextLink(order).label}</Link>
        ) : null}
        {order.status === 'FAILED' || order.status === 'CANCELLED' ? (
          <Link href={retryLink(order).href} className="inline-flex min-h-11 items-center rounded-full bg-green-800 px-5 text-sm font-bold text-white">{retryLink(order).label}</Link>
        ) : null}
        <Link href="/profile/orders" className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold text-green-800 underline">Orders and receipts</Link>
      </div>
    </div>
  );
}
