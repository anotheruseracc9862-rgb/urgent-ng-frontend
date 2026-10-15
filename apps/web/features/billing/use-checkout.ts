'use client';

import { useRouter } from 'next/navigation';
import type { Order } from './api';
import { nextStepForOrder, rememberPendingOrder } from './checkout';

/** Leaves the app for the gateway, or opens the checkout page when there is nothing to pay. */
export function useContinueToCheckout() {
  const router = useRouter();
  return (order: Order) => {
    const step = nextStepForOrder(order);
    if (step.kind === 'gateway') {
      rememberPendingOrder(order.id);
      window.location.assign(step.url);
      return;
    }
    router.push(step.path);
  };
}
