'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@urgent/ui';
import { readPendingOrder } from './checkout';

/**
 * The gateway sends the browser back to one fixed URL. The order id was remembered before the
 * redirect; without it the orders list still shows the result, because the webhook settles it.
 */
export function CheckoutReturn() {
  const router = useRouter();

  React.useEffect(() => {
    const orderId = readPendingOrder();
    router.replace(orderId ? `/checkout/${encodeURIComponent(orderId)}` : '/profile/orders');
  }, [router]);

  return (
    <div className="mx-auto grid max-w-xl gap-3" aria-label="Returning from payment">
      <Skeleton className="h-24" />
      <p role="status" className="text-sm text-muted">Checking your payment…</p>
    </div>
  );
}
