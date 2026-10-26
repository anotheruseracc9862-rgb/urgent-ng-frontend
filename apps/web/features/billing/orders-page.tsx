'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate, formatMoney } from '@urgent/utils';
import { PageHead } from '@/components/shell/page-head';
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
    <li className="border-t border-line-2 px-1 py-4 first:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block text-sm font-extrabold text-ink">{ORDER_TYPE_LABEL[order.type]}</strong>
          <time dateTime={order.createdAt} className="mt-1 block text-xs text-muted">{formatDate(order.createdAt, 'medium')}</time>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11.5px] font-extrabold ${STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-[var(--r-sm)] bg-panel px-3 py-2">
          <dt className="text-[11px] text-muted">Total</dt>
          <dd className="mt-0.5 text-xs font-bold text-ink-2">{formatMoney(order.amountMinor)}</dd>
        </div>
        <div className="rounded-[var(--r-sm)] bg-panel px-3 py-2">
          <dt className="text-[11px] text-muted">VAT included</dt>
          <dd className="mt-0.5 text-xs font-bold text-ink-2">{formatMoney(order.vatMinor)}</dd>
        </div>
        <div className="col-span-2 rounded-[var(--r-sm)] bg-panel px-3 py-2 sm:col-span-1">
          <dt className="text-[11px] text-muted">Paid</dt>
          <dd className="mt-0.5 text-xs font-bold text-ink-2">{order.paidAt ? formatDate(order.paidAt, 'medium') : 'Not paid'}</dd>
        </div>
      </dl>
      {order.payment?.reference ? <p className="mt-2 break-all text-xs text-muted">Reference: {order.payment.reference}</p> : null}
      {order.status === 'PENDING' ? (
        <Link
          href={`/checkout/${encodeURIComponent(order.id)}`}
          className="mt-3 inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#0f1822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          Check payment
        </Link>
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
    <div className="grid min-w-0 gap-4">
      <PageHead
        eyebrow="Account"
        title="Orders and receipts"
        description="Runner Pro, boosts and verification fees. Prices include VAT."
      />

      {orders.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load your orders.</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => void orders.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      <section aria-label="Orders" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
        {orders.isPending ? (
          <div className="grid gap-4" role="status" aria-label="Loading orders" aria-busy="true">
            {[0, 1].map((row) => (
              <div key={row} className="grid gap-3 border-t border-line-2 py-4 first:border-0">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-28" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[0, 1, 2].map((cell) => <Skeleton key={cell} className="h-14 rounded-[var(--r-sm)]" />)}
                </div>
              </div>
            ))}
          </div>
        ) : !items.length && !orders.error ? (
          <div className="grid justify-items-center gap-2.5 px-5 py-10 text-center" role="status">
            <span aria-hidden="true" className="grid size-14 place-items-center rounded-[18px] bg-panel text-ink-2">
              <Receipt className="size-6" />
            </span>
            <h2 className="text-[15px] font-extrabold text-ink">No orders yet</h2>
            <p className="max-w-md text-sm text-muted">When you buy Runner Pro, a boost or a verification, it shows up here.</p>
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
