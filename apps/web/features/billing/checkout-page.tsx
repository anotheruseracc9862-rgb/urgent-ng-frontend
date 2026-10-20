'use client';

import { PageHead } from '@/components/shell/page-head';
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

  // The order itself is cheap to read, so show it straight away.
  const checked = useQuery<CheckedOrder>({
    queryKey: queryKeys.billing.order(orderId),
    queryFn: async () => ({ order: await billingApi.order(orderId), providerUnavailable: false }),
  });
  const pending = checked.data?.order.status === 'PENDING';

  // Asking the gateway can take several seconds, so it runs behind the page, not in front of it.
  const verification = useQuery({
    queryKey: [...queryKeys.billing.order(orderId), 'verify'],
    enabled: pending && !waitedOut,
    queryFn: async (): Promise<CheckedOrder | null> => {
      try {
        return { order: await billingApi.verify(orderId), providerUnavailable: false };
      } catch (error) {
        return isApiError(error) && error.code === 'PAYMENT_PROVIDER_UNAVAILABLE'
          ? { order: checked.data!.order, providerUnavailable: true }
          : null;
      }
    },
    refetchInterval: () => {
      const started = startedAt.current;
      return started !== null && Date.now() - started < POLL_WINDOW_MS ? POLL_MS : false;
    },
    gcTime: 0,
  });
  const verified = verification.data;
  React.useEffect(() => {
    if (verified && verified.order.status !== 'PENDING') client.setQueryData(queryKeys.billing.order(orderId), verified);
  }, [verified, client, orderId]);
  const providerUnavailable = Boolean(verified?.providerUnavailable);

  const status = checked.data?.order.status;
  React.useEffect(() => {
    if (!status || status === 'PENDING') return;
    clearPendingOrder();
    void client.invalidateQueries({ queryKey: queryKeys.billing.orders() });
    if (status === 'PAID') {
      void client.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
      // Runner Pro changes the offer allowance, eligibility and badges straight away.
      void client.invalidateQueries({ queryKey: queryKeys.runner.all() });
      void client.invalidateQueries({ queryKey: ['verification'] });
      void client.invalidateQueries({ queryKey: queryKeys.errands.all() });
      void client.invalidateQueries({ queryKey: queryKeys.marketplace.all() });
    }
  }, [status, client]);

  if (checked.isPending) {
    return <PageLoading title="Payment" eyebrow="Billing" />;
  }
  if (checked.error || !checked.data) {
    const notFound = isApiError(checked.error) && checked.error.status === 404;
    return (
      <div className="grid min-w-0 gap-3">
        <Alert variant="danger" role="alert">
          <p>{notFound ? 'We could not find this order.' : 'We could not load this order.'}</p>
          {!notFound ? <Button type="button" variant="ghost" size="sm" onClick={() => void checked.refetch()}>Try again</Button> : null}
        </Alert>
        <Link href="/profile/orders" className="text-sm font-bold text-green-800 underline">See your orders</Link>
      </div>
    );
  }

  const { order } = checked.data;
  const stillChecking = order.status === 'PENDING' && !waitedOut;

  return (
    <div className="grid min-w-0 gap-4">
      <PageHead eyebrow="Payment" title={ORDER_TYPE_LABEL[order.type]} />

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
            <Button type="button" variant="ghost" size="sm" onClick={() => { startedAt.current = Date.now(); setWaitedOut(false); void verification.refetch(); }}>Check again</Button>
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

      <section className="grid min-w-0 gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]" aria-label="Order summary">
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted">Item</dt><dd className="font-bold text-ink">{ORDER_TYPE_LABEL[order.type]}</dd></div>
          <div className="flex justify-between gap-3 border-t border-line pt-3"><dt className="text-muted">Total</dt><dd className="font-extrabold text-ink">{formatMoney(order.amountMinor)}</dd></div>
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          {order.status === 'PAID' ? (
            <Link href={nextLink(order).href} className="inline-flex min-h-11 items-center rounded-full bg-lime px-5 text-sm font-bold text-ink hover:bg-lime-600">{nextLink(order).label}</Link>
          ) : null}
          {order.status === 'FAILED' || order.status === 'CANCELLED' ? (
            <Link href={retryLink(order).href} className="inline-flex min-h-11 items-center rounded-full bg-lime px-5 text-sm font-bold text-ink hover:bg-lime-600">{retryLink(order).label}</Link>
          ) : null}
          <Link href="/profile/orders" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-green-800 underline">Orders and receipts</Link>
        </div>
      </section>
    </div>
  );
}
