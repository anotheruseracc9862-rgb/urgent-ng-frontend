'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate, formatMoney } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { billingApi, ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, type Order } from './api';

const STATUS_STYLE: Record<Order['status'], string> = {
  PENDING: 'bg-amber-bg text-[#7a4800]',
  PAID: 'bg-ok-bg text-[#145c30]',
  FAILED: 'bg-red-bg text-[#8f2a22]',
  CANCELLED: 'bg-panel text-ink-2',
  REFUNDED: 'bg-blue-bg text-[#1b3f8f]',
};

function OrderRow({ order }: { order: Order }) {
  return (
    <li className="border-b border-line py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block text-sm font-extrabold text-ink">{ORDER_TYPE_LABEL[order.type]}</strong>
          <time dateTime={order.createdAt} className="mt-1 block text-xs text-muted">{formatDate(order.createdAt, 'medium')}</time>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
      </div>
      <dl className="mt-3 grid gap-1 text-xs text-ink-2 sm:grid-cols-3">
        <div><dt className="text-muted">Total</dt><dd className="font-bold">{formatMoney(order.amountMinor)}</dd></div>
        <div><dt className="text-muted">VAT included</dt><dd className="font-bold">{formatMoney(order.vatMinor)}</dd></div>
        <div><dt className="text-muted">Paid</dt><dd className="font-bold">{order.paidAt ? formatDate(order.paidAt, 'medium') : 'Not paid'}</dd></div>
      </dl>
      {order.payment?.reference ? <p className="mt-2 text-xs text-muted">Reference: {order.payment.reference}</p> : null}
      {order.status === 'PENDING' ? (
        <Link href={`/checkout/${encodeURIComponent(order.id)}`} className="mt-2 inline-block text-xs font-bold text-green-800 underline">Check payment</Link>
      ) : null}
    </li>
  );
}

export function OrdersPage() {
  const orders = useInfiniteQuery({
    queryKey: [...queryKeys.billing.orders(), 'infinite'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => billingApi.orders(pageParam),
    getNextPageParam: (page) => (typeof page.meta?.nextCursor === 'string' ? page.meta.nextCursor : undefined),
  });
  const items = orders.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Account</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Orders and receipts</h1>
        <p className="mt-1 text-sm text-muted">Runner Pro, boosts and verification fees. Prices include VAT.</p>
      </header>

      {orders.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load your orders.</p>
          {isApiError(orders.error) && orders.error.requestId ? <p className="mt-1 text-xs">Request ID: {orders.error.requestId}</p> : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => void orders.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      <section aria-label="Orders" className="rounded-[var(--r-lg)] border border-line bg-surface px-4 shadow-[var(--shadow)] sm:px-5">
        {orders.isPending ? (
          <div className="grid gap-4 py-5" aria-label="Loading orders"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : !items.length && !orders.error ? (
          <div className="py-12 text-center">
            <h2 className="text-sm font-extrabold text-ink">No orders yet</h2>
            <p className="mt-1 text-sm text-muted">When you buy Runner Pro, a boost or a verification, it shows up here.</p>
          </div>
        ) : (
          <ul>{items.map((order) => <OrderRow key={order.id} order={order} />)}</ul>
        )}
        {orders.hasNextPage ? (
          <div className="border-t border-line py-4 text-center">
            <Button type="button" variant="ghost" size="sm" disabled={orders.isFetchingNextPage} onClick={() => void orders.fetchNextPage()}>
              {orders.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
