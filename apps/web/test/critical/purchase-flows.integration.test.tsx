import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError, listen, server } from '@/test/msw/server';
import { BoostsPage } from '@/features/billing/boosts-page';
import { CheckoutPage } from '@/features/billing/checkout-page';
import { ProPage } from '@/features/billing/pro-page';
import { readPendingOrder } from '@/features/billing/checkout';
import { CheckoutReturn } from '@/features/billing/checkout-return';

/**
 * Critical purchase flows against a small stateful stand-in for the backend: buy, leave for the
 * gateway, come back, verify (twice, as a webhook plus a manual check would), and see the result.
 */

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn() }),
  usePathname: () => '/pro',
}));

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-critical' });
const assign = vi.fn();

interface Store {
  orders: Map<string, Record<string, unknown>>;
  pro: Record<string, unknown>;
  boostedErrands: Set<string>;
  verifyCalls: number;
  seq: number;
}

let store: Store;

function mount(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function install() {
  server.use(
    http.get('*/billing/products', () => envelope([
      { code: 'RUNNER_PRO', name: 'Runner Pro', orderType: 'RUNNER_PRO', priceMinor: 500000, vatMinor: 34884, currency: 'NGN', periodDays: 30 },
      { code: 'BOOST', name: 'Boost', orderType: 'BOOST', priceMinor: 100000, vatMinor: 6977, currency: 'NGN', periodDays: null },
    ])),
    http.get('*/subscriptions/pro', () => envelope(store.pro)),
    http.get('*/errands/mine', () => envelope([{ id: 'e1', title: 'Collect parcel', status: 'OPEN' }])),
    http.get('*/billing/orders', () => envelope([...store.orders.values()])),
    http.get('*/billing/orders/:id', ({ params }) => envelope(store.orders.get(String(params.id)))),
    http.post('*/billing/orders/:id/verify', ({ params }) => {
      store.verifyCalls += 1;
      const order = store.orders.get(String(params.id))!;
      if (order.status === 'PENDING') {
        order.status = 'PAID';
        order.paidAt = '2026-10-15T09:00:00Z';
        if (order.type === 'RUNNER_PRO') {
          store.pro = { active: true, status: 'ACTIVE', currentPeriodEnd: '2026-11-15T00:00:00Z', graceEndsAt: null, autoRenew: true, cancelledAt: null };
        } else {
          store.boostedErrands.add(String(order.errandId));
        }
      }
      return envelope(order);
    }),
    http.post('*/billing/orders', () => {
      store.seq += 1;
      const order = {
        id: `order-${store.seq}`, type: 'RUNNER_PRO', status: 'PENDING', amountMinor: 500000, vatMinor: 34884, currency: 'NGN',
        errandId: null, paidAt: null, createdAt: '2026-10-15T08:00:00Z',
        payment: { reference: `ref-${store.seq}`, status: 'INITIATED', authorizationUrl: 'https://checkout.paystack.com/pay' },
      };
      store.orders.set(order.id, order);
      return envelope(order);
    }),
    http.post('*/boosts', async ({ request }) => {
      const { errandId } = (await request.json()) as { errandId: string };
      if (store.boostedErrands.has(errandId)) return apiError(409, 'BOOST_NOT_ELIGIBLE', 'no', { reason: 'ALREADY_BOOSTED' });
      store.seq += 1;
      const order = {
        id: `order-${store.seq}`, type: 'BOOST', status: 'PENDING', amountMinor: 100000, vatMinor: 6977, currency: 'NGN',
        errandId, paidAt: null, createdAt: '2026-10-15T08:00:00Z',
        payment: { reference: `ref-${store.seq}`, status: 'INITIATED', authorizationUrl: 'https://checkout.paystack.com/pay' },
      };
      store.orders.set(order.id, order);
      return envelope(order);
    }),
  );
}

beforeAll(() => listen());
beforeEach(() => {
  store = {
    orders: new Map(),
    pro: { active: false, status: 'NONE', currentPeriodEnd: null, graceEndsAt: null, autoRenew: false, cancelledAt: null },
    boostedErrands: new Set(),
    verifyCalls: 0,
    seq: 0,
  };
  replace.mockReset();
  assign.mockReset();
  sessionStorage.clear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign, origin: window.location.origin, href: window.location.href },
  });
  install();
});
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());

describe('Runner Pro purchase', () => {
  it('buy, leave for the gateway, return, verify twice, and end up active once', async () => {
    const first = mount(<ProPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.paystack.com/pay'));
    expect(readPendingOrder()).toBe('order-1');
    first.unmount();

    // The gateway sends the browser to the fixed return URL, which finds the order.
    const back = mount(<CheckoutReturn />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/checkout/order-1'));
    back.unmount();

    const checkout = mount(<CheckoutPage orderId="order-1" />);
    expect(await screen.findByText('Payment received.')).toBeTruthy();
    checkout.unmount();

    // A second visit (or a webhook replay) changes nothing: it is already paid and is not re-verified.
    const again = mount(<CheckoutPage orderId="order-1" />);
    expect(await screen.findByText('Payment received.')).toBeTruthy();
    expect(store.verifyCalls).toBe(1);
    again.unmount();

    mount(<ProPage />);
    expect((await screen.findAllByRole('status')).some((node) => /Runner Pro is active/.test(node.textContent ?? ''))).toBe(true);
    expect(screen.queryByRole('button', { name: 'Continue to payment' })).toBeNull();
  });

  it('a browser that never returns still shows paid on the next visit', async () => {
    store.orders.set('order-9', {
      id: 'order-9', type: 'RUNNER_PRO', status: 'PAID', amountMinor: 500000, vatMinor: 34884, currency: 'NGN',
      errandId: null, payment: null, paidAt: '2026-10-15T09:00:00Z', createdAt: '2026-10-15T08:00:00Z',
    });
    mount(<CheckoutPage orderId="order-9" />);
    expect(await screen.findByText('Payment received.')).toBeTruthy();
    expect(store.verifyCalls).toBe(0);
  });
});

describe('Boost purchase', () => {
  it('buy, pay, show boosted, and refuse a second boost on the same errand', async () => {
    const first = mount(<BoostsPage errandId="e1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Boost this errand' }));
    await waitFor(() => expect(assign).toHaveBeenCalled());
    first.unmount();

    const checkout = mount(<CheckoutPage orderId="order-1" />);
    expect(await screen.findByText('Payment received.')).toBeTruthy();
    checkout.unmount();

    const boosts = mount(<BoostsPage errandId="e1" />);
    expect(await screen.findByText('Boosted')).toBeTruthy();
    boosts.unmount();

    // The backend still refuses a second purchase if one is attempted directly.
    const response = await fetch(new URL('/api/v1/boosts', window.location.origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errandId: 'e1' }),
    });
    expect(response.status).toBe(409);
  });
});
