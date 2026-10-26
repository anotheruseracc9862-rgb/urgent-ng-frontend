import type { components } from '@urgent/api-client';
import { api, apiResponse } from '@/lib/api/client';

export type Product = components['schemas']['ProductDto'];
export type Order = components['schemas']['OrderDto'];
export type ProSubscription = components['schemas']['ProSubscriptionDto'];
export type OrderStatus = Order['status'];
export type OrderType = Order['type'];

const withKey = (key: string) => ({ 'Idempotency-Key': key });

export const billingApi = {
  products: () => api<Product[]>('/billing/products'),
  pro: () => api<ProSubscription>('/subscriptions/pro'),
  cancelPro: () => api<ProSubscription>('/subscriptions/pro/cancel', { method: 'POST', body: {} }),
  createOrder: (type: 'RUNNER_PRO' | 'VERIFICATION_FEE', key: string, autoRenew?: boolean) =>
    api<Order>('/billing/orders', {
      method: 'POST',
      body: type === 'RUNNER_PRO' ? { type, autoRenew: autoRenew ?? false } : { type },
      headers: withKey(key),
    }),
  boost: (errandId: string, key: string) =>
    api<Order>('/boosts', { method: 'POST', body: { errandId }, headers: withKey(key) }),
  order: (id: string) => api<Order>(`/billing/orders/${encodeURIComponent(id)}`),
  verify: (id: string) =>
    api<Order>(`/billing/orders/${encodeURIComponent(id)}/verify`, { method: 'POST', body: {} }),
  orders: (cursor?: string) =>
    apiResponse<Order[]>('/billing/orders', { query: { cursor, limit: 20 } }),
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  VERIFICATION_FEE: 'Verification fee',
  RUNNER_PRO: 'Runner Pro',
  BOOST: 'Errand boost',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Waiting for payment',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

/** Product that buys one order type, from the live catalogue. */
export function productFor(products: Product[] | undefined, type: OrderType): Product | undefined {
  return products?.find((product) => product.orderType === type);
}
