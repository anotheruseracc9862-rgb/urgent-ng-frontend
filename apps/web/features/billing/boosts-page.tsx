'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Check, Zap } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate, formatMoney } from '@urgent/utils';
import { PageHead } from '@/components/shell/page-head';
import { errandsApi } from '@/features/errands/api';
import { queryKeys } from '@/lib/query/keys';
import { useApiMutation } from '@/lib/query/mutations';
import { billingApi, productFor, type Order } from './api';
import { BoostBadge } from './boost-badge';
import type { components } from '@urgent/api-client';
import { billingErrorMessage } from './messages';
import { useIntentKey } from './use-intent-key';
import { useContinueToCheckout } from './use-checkout';

function BoostRow({ errandId, title, boost, boostedOrder, price, selected }: {
  errandId: string;
  title: string;
  /** The boost running now, from the errand itself. This, and not an old paid order, says whether it is boosted. */
  boost: components['schemas']['ErrandBoostDto'] | null;
  boostedOrder: Order | undefined;
  price: string | null;
  selected: boolean;
}) {
  const intent = useIntentKey();
  const continueToCheckout = useContinueToCheckout();
  const buy = useApiMutation({
    mutationFn: () => billingApi.boost(errandId, intent.keyFor(`boost:${errandId}`)),
    // A new order appears in the orders list and the errand becomes boosted once it is paid.
    affects: ['billing'],
    onSuccess: (order) => {
      intent.reset();
      continueToCheckout(order);
    },
  });
  const live = Boolean(boost);
  const pending = !live && boostedOrder?.status === 'PENDING';

  return (
    <li className={`grid min-w-0 gap-3 rounded-[var(--r-lg)] border p-4 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
      selected ? 'border-lime-600 bg-tint-2/40 ring-2 ring-lime-600/20' : 'border-line-2 bg-panel/50'
    }`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-[13px] ${live ? 'bg-ok-bg text-ok' : 'bg-tint-2 text-green-900'}`}>
          {live ? <Check aria-hidden="true" className="size-[18px]" /> : <Zap aria-hidden="true" className="size-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/errands/${encodeURIComponent(errandId)}`} className="block truncate text-sm font-extrabold text-ink hover:underline">{title}</Link>
          {live ? (
            <div className="mt-1.5 grid gap-1">
              <BoostBadge boost={boost} className="w-fit" />
              <p className="text-xs leading-relaxed text-ok">
                It is already boosted, so it cannot be boosted again. It ends when the boost period passes or the errand closes{boostedOrder?.paidAt ? `. Paid ${formatDate(boostedOrder.paidAt, 'medium')}` : ''}.
              </p>
            </div>
          ) : pending ? (
            <p className="mt-1 text-xs leading-relaxed text-muted">A boost payment is waiting to be confirmed.</p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-muted">Shown higher in the runner feed{price ? ` for ${price}, VAT included` : ''}.</p>
          )}
          {buy.error ? (
            <p role="alert" className="mt-2 text-xs font-bold text-danger">
              {billingErrorMessage(buy.error)}
            </p>
          ) : null}
        </div>
      </div>
      {live ? (
        <span className="inline-flex min-h-9 items-center justify-center rounded-full bg-ok-bg px-3.5 text-xs font-extrabold text-[#145c30]">Boosted</span>
      ) : pending ? (
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href={`/checkout/${encodeURIComponent(boostedOrder.id)}`}>Check payment</Link>
        </Button>
      ) : (
        <Button type="button" size="sm" disabled={buy.isPending} onClick={() => buy.mutate()} className="w-full sm:w-auto">
          {buy.isPending ? 'Starting…' : 'Boost this errand'}
        </Button>
      )}
    </li>
  );
}

export function BoostsPage({ errandId }: { errandId?: string }) {
  const open = useQuery({
    queryKey: queryKeys.errands.list({ tab: 'OPEN', boosts: true }),
    queryFn: () => errandsApi.mine({ tab: 'OPEN', sort: 'RECENT', limit: 50 }),
  });
  const products = useQuery({ queryKey: queryKeys.billing.products(), queryFn: billingApi.products });
  const orders = useQuery({ queryKey: queryKeys.billing.orders(), queryFn: () => billingApi.orders() });

  const product = productFor(products.data, 'BOOST');
  const price = product ? formatMoney(product.priceMinor) : null;
  const boostOrders = new Map<string, Order>();
  for (const order of orders.data?.data ?? []) {
    if (order.type !== 'BOOST' || !order.errandId) continue;
    const current = boostOrders.get(order.errandId);
    if (!current || (current.status !== 'PAID' && order.status === 'PAID')) boostOrders.set(order.errandId, order);
  }
  const errands = open.data?.data ?? [];

  return (
    <div className="grid min-w-0 gap-4">
      <PageHead
        eyebrow="Boosts"
        title="Get your errand seen sooner"
        description={`A boost lifts an open errand in the runner feed${product?.periodDays ? ` for ${product.periodDays} days` : ''}. Only open errands without a selected runner can be boosted.`}
      />

      {open.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load your open errands.</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => void open.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      <section aria-label="Open errands" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
        {open.isPending ? (
          <div className="grid gap-3" role="status" aria-label="Loading errands" aria-busy="true">
            {[0, 1].map((row) => (
              <div key={row} className="grid gap-3 rounded-[var(--r-lg)] border border-line-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-[13px]" />
                  <div className="grid flex-1 gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                </div>
                <Skeleton className="h-9 w-full rounded-full sm:w-36" />
              </div>
            ))}
          </div>
        ) : !errands.length && !open.error ? (
          <div className="grid justify-items-center gap-2.5 px-5 py-10 text-center" role="status">
            <span aria-hidden="true" className="grid size-14 place-items-center rounded-[18px] bg-panel text-ink-2">
              <Zap className="size-6" />
            </span>
            <h2 className="text-[15px] font-extrabold text-ink">No open errands to boost</h2>
            <p className="max-w-md text-sm text-muted">Post an errand first, then come back to boost it.</p>
            <Button asChild className="mt-1"><Link href="/errands/new">Post an errand</Link></Button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {errands.map((errand) => (
              <BoostRow
                key={errand.id}
                errandId={errand.id}
                title={errand.title}
                boost={errand.boost}
                boostedOrder={boostOrders.get(errand.id)}
                price={price}
                selected={errand.id === errandId}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
