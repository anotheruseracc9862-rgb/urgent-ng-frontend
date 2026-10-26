import type { Order } from './api';

const PENDING_ORDER_KEY = 'urgent.pending-order';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Remember which order the gateway is about to take the browser away for. Only an id, never a token. */
export function rememberPendingOrder(orderId: string): void {
  try {
    storage()?.setItem(PENDING_ORDER_KEY, orderId);
  } catch {
    // Storage can be blocked; the orders list still finds the order.
  }
}

export function readPendingOrder(): string | null {
  try {
    return storage()?.getItem(PENDING_ORDER_KEY) ?? null;
  } catch {
    return null;
  }
}

export function clearPendingOrder(): void {
  try {
    storage()?.removeItem(PENDING_ORDER_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Only an https gateway page may take the browser away from the app. */
export function gatewayUrl(order: Pick<Order, 'payment'>): string | null {
  const raw = order.payment?.authorizationUrl;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Where to send the browser after an order is created. */
export function nextStepForOrder(order: Order): { kind: 'gateway'; url: string } | { kind: 'checkout'; path: string } {
  const url = order.status === 'PENDING' ? gatewayUrl(order) : null;
  if (url) return { kind: 'gateway', url };
  return { kind: 'checkout', path: `/checkout/${encodeURIComponent(order.id)}` };
}
