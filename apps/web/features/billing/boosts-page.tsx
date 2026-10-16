'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate, formatMoney } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { errandsApi } from '@/features/errands/api';
import { queryKeys } from '@/lib/query/keys';
import { useApiMutation } from '@/lib/query/mutations';
import { billingApi, productFor, type Order } from './api';
import { billingErrorMessage } from './messages';
import { useIntentKey } from './use-intent-key';
import { useContinueToCheckout } from './use-checkout';

function BoostRow({ errandId, title, boostedOrder, price, selected }: {
  errandId: string;
  title: string;
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
  const pending = boostedOrder?.status === 'PENDING';
  const live = boostedOrder?.status === 'PAID';

  return (
    <li className={`grid gap-3 rounded-[var(--r)] border p-4 sm:grid-cols-[1fr_auto] sm:items-center ${selected ? 'border-lime-600' : 'border-line'}`}>
      <div className="min-w-0">
        <Link href={`/errands/${encodeURIComponent(errandId)}`} className="block truncate text-sm font-extrabold text-ink hover:underline">{title}</Link>
        {live ? (
          <p className="mt-1 text-xs text-ok">
            Boosted since {boostedOrder.paidAt ? formatDate(boostedOrder.paidAt, 'medium') : 'now'}. It ends when the boost period passes or the errand closes.
          </p>
        ) : pending ? (
          <p className="mt-1 text-xs text-muted">
            A boost payment is waiting. <Link className="underline" href={`/checkout/${encodeURIComponent(boostedOrder.id)}`}>Check payment</Link>
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">Shown higher in the runner feed{price ? ` for ${price}, VAT included` : ''}.</p>
        )}
        {buy.error ? (
          <p role="alert" className="mt-2 text-xs font-bold text-danger">
            {billingErrorMessage(buy.error)}
            {isApiError(buy.error) && buy.error.requestId ? ` (Request ID: ${buy.error.requestId})` : ''}
          </p>
        ) : null}
      </div>
      {live ? (
        <span className="rounded-full bg-ok-bg px-3 py-1 text-xs font-extrabold text-[#145c30]">Boosted</span>
      ) : (
        <Button type="button" size="sm" disabled={buy.isPending || pending} onClick={() => buy.mutate()}>
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
    <div className="mx-auto grid max-w-3xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Boosts</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Get your errand seen sooner</h1>
        <p className="mt-1 text-sm text-muted">
          A boost lifts an open errand in the runner feed{product?.periodDays ? ` for ${product.periodDays} days` : ''}.
          Only open errands without a selected runner can be boosted.
        </p>
      </header>

      {open.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load your open errands.</p>
          {isApiError(open.error) && open.error.requestId ? <p className="mt-1 text-xs">Request ID: {open.error.requestId}</p> : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => void open.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      <section aria-label="Open errands" className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        {open.isPending ? (
          <div className="grid gap-3" aria-label="Loading errands"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : !errands.length && !open.error ? (
          <div className="py-10 text-center">
            <h2 className="text-sm font-extrabold text-ink">No open errands to boost</h2>
            <p className="mt-1 text-sm text-muted">Post an errand first, then come back to boost it.</p>
            <Link href="/errands/new" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-green-800 px-5 text-sm font-bold text-white">Post an errand</Link>
          </div>
        ) : (
          <ul className="grid gap-3">
            {errands.map((errand) => (
              <BoostRow
                key={errand.id}
                errandId={errand.id}
                title={errand.title}
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
