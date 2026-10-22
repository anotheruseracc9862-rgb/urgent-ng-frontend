import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError, listen, server } from '@/test/msw/server';
import type { Order, ProSubscription } from './api';
import { BoostsPage } from './boosts-page';
import { CheckoutPage } from './checkout-page';
import { OrdersPage } from './orders-page';
import { ProPage } from './pro-page';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push, refresh: vi.fn() }),
  usePathname: () => '/pro',
}));

const envelope = (data: unknown, meta: unknown = {}) => HttpResponse.json({ data, meta, requestId: 'req-billing' });

const products = [
  { code: 'RUNNER_PRO', name: 'Runner Pro', orderType: 'RUNNER_PRO', priceMinor: 500000, vatMinor: 34884, currency: 'NGN', periodDays: 30 },
  { code: 'BOOST', name: 'Boost', orderType: 'BOOST', priceMinor: 100000, vatMinor: 6977, currency: 'NGN', periodDays: 7 },
];

const sub = (patch: Partial<ProSubscription>): ProSubscription => ({
  active: false, status: 'NONE', currentPeriodEnd: null, graceEndsAt: null, autoRenew: false, cancelledAt: null, ...patch,
});

const order = (patch: Partial<Order>): Order => ({
  id: 'order-1', type: 'RUNNER_PRO', status: 'PENDING', amountMinor: 500000, vatMinor: 34884, currency: 'NGN',
  errandId: null, payment: null, paidAt: null, createdAt: '2026-10-15T08:00:00Z', ...patch,
});

function renderWith(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

const assign = vi.fn();

beforeAll(() => listen());
beforeEach(() => {
  push.mockReset();
  assign.mockReset();
  server.use(http.get('*/billing/products', () => envelope(products)));
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign, origin: window.location.origin, href: window.location.href },
  });
});
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());

describe('Runner Pro', () => {
  it('lists every Pro payment as a card and stacks the periods they cover', async () => {
    const now = Date.now();
    const day = 86_400_000;
    server.use(
      http.get('*/subscriptions/pro', () => envelope(sub({ active: true, status: 'ACTIVE', currentPeriodEnd: new Date(now + 50 * day).toISOString() }))),
      http.get('*/billing/orders', () => envelope([
        order({ id: 'order-b', status: 'PAID', paidAt: new Date(now - 5 * day).toISOString() }),
        order({ id: 'order-a', status: 'PAID', paidAt: new Date(now - 10 * day).toISOString() }),
        order({ id: 'order-boost', type: 'BOOST', status: 'PAID', paidAt: new Date(now - 1 * day).toISOString() }),
      ])),
    );
    renderWith(<ProPage />);
    const list = within(await screen.findByRole('region', { name: 'Your Runner Pro purchases' }));
    expect(list.getAllByRole('listitem')).toHaveLength(2);
    expect(list.getAllByRole('link', { name: 'View receipt' }).map((link) => link.getAttribute('href'))).toEqual(['/checkout/order-b', '/checkout/order-a']);
    // The first payment is running now; the second starts when the first ends.
    expect(list.getByText('Active now')).toBeInTheDocument();
    expect(list.getByText('Starts later')).toBeInTheDocument();
  });

  it.each([
    ['ACTIVE', { active: true, status: 'ACTIVE', autoRenew: true, currentPeriodEnd: '2026-11-15T00:00:00Z' }, /Runner Pro is active/],
    ['GRACE_PERIOD', { active: true, status: 'GRACE_PERIOD', graceEndsAt: '2026-10-20T00:00:00Z' }, /renewal payment failed/],
    ['CANCELLED', { active: true, status: 'CANCELLED', currentPeriodEnd: '2026-11-15T00:00:00Z' }, /keep your benefits until/],
    ['EXPIRED', { active: false, status: 'EXPIRED' }, /Runner Pro has ended/],
  ] as const)('shows a banner for %s', async (_name, patch, text) => {
    server.use(http.get('*/subscriptions/pro', () => envelope(sub(patch))));
    renderWith(<ProPage />);
    expect((await screen.findAllByRole('status')).some((node) => text.test(node.textContent ?? ''))).toBe(true);
  });

  it('starts payment with an idempotency key and the auto-renew choice', async () => {
    let key = '';
    let body: unknown;
    server.use(
      http.get('*/subscriptions/pro', () => envelope(sub({}))),
      http.post('*/billing/orders', async ({ request }) => {
        key = request.headers.get('Idempotency-Key') ?? '';
        body = await request.json();
        return envelope(order({ payment: { reference: 'ref', status: 'INITIATED', authorizationUrl: 'https://checkout.paystack.com/abc' } }), {});
      }),
    );
    renderWith(<ProPage />);
    fireEvent.click(await screen.findByLabelText(/Renew automatically/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.paystack.com/abc'));
    expect(key).toMatch(/[0-9a-f-]{36}/);
    expect(body).toEqual({ type: 'RUNNER_PRO', autoRenew: true });
  });

  it('cancels and keeps benefits to the period end', async () => {
    let cancelled = false;
    server.use(
      http.get('*/subscriptions/pro', () => envelope(sub({ active: true, status: 'ACTIVE', autoRenew: true, currentPeriodEnd: '2026-11-15T00:00:00Z' }))),
      http.post('*/subscriptions/pro/cancel', () => {
        cancelled = true;
        return envelope(sub({ active: true, status: 'CANCELLED', currentPeriodEnd: '2026-11-15T00:00:00Z', cancelledAt: '2026-10-15T09:00:00Z' }));
      }),
    );
    renderWith(<ProPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel Runner Pro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel Pro' }));
    await waitFor(() => expect(cancelled).toBe(true));
    expect(await screen.findByText(/You keep your benefits until/)).toBeTruthy();
  });

  it('shows a plain message when purchases are paused', async () => {
    server.use(
      http.get('*/subscriptions/pro', () => envelope(sub({}))),
      http.post('*/billing/orders', () => apiError(503, 'FEATURE_DISABLED', 'off')),
    );
    renderWith(<ProPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }));
    expect(await screen.findByText(/Purchases are paused/)).toBeTruthy();
  });
});

describe('Boosts', () => {
  const open = [{ id: 'e1', title: 'Collect parcel', status: 'OPEN' }];

  it('says up front what a boost does and does not give back', async () => {
    server.use(
      http.get('*/errands/mine', () => envelope(open)),
      http.get('*/billing/orders', () => envelope([])),
    );
    renderWith(<BoostsPage />);
    expect(await screen.findByText(/isn't refunded once it has started/)).toBeTruthy();
  });

  it('says an errand is already boosted when the backend refuses a second purchase', async () => {
    server.use(
      http.get('*/errands/mine', () => envelope(open)),
      http.get('*/billing/orders', () => envelope([])),
      http.post('*/boosts', () => apiError(409, 'BOOST_NOT_ELIGIBLE', 'no', { reason: 'ALREADY_BOOSTED' })),
    );
    renderWith(<BoostsPage errandId="e1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Boost this errand' }));
    expect(await screen.findByText(/already boosted/i)).toBeTruthy();
  });

  it('explains why a closed errand cannot be boosted', async () => {
    server.use(
      http.get('*/errands/mine', () => envelope(open)),
      http.get('*/billing/orders', () => envelope([])),
      http.post('*/boosts', () => apiError(409, 'BOOST_NOT_ELIGIBLE', 'no', { reason: 'NOT_OPEN' })),
    );
    renderWith(<BoostsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Boost this errand' }));
    expect(await screen.findByText(/open errand without a selected runner/i)).toBeTruthy();
  });

  it('shows a boost that is running as boosted, with when it ends, and offers no second boost', async () => {
    const endsAt = new Date(Date.now() + 5 * 3_600_000).toISOString();
    server.use(
      http.get('*/errands/mine', () => envelope([{ ...open[0], boost: { expiresAt: endsAt, startedAt: new Date().toISOString(), openedByCount: 5, offersSinceCount: 2 } }])),
      http.get('*/billing/orders', () => envelope([order({ type: 'BOOST', status: 'PAID', errandId: 'e1', paidAt: '2026-10-15T09:00:00Z' })])),
    );
    renderWith(<BoostsPage />);
    expect((await screen.findAllByText(/^Boosted/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/· until /)).toBeTruthy();
    expect(screen.getByText(/cannot be boosted again/)).toBeTruthy();
    expect(screen.getByText(/opened by 5 runners · 2 offers/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Boost this errand' })).toBeNull();
  });

  it('says how long a boost bought now would run, before the person buys', async () => {
    const endsAt = new Date(Date.now() + 2 * 3_600_000 + 20_000).toISOString();
    server.use(
      http.get('*/errands/mine', () => envelope([{ ...open[0], boost: null, boostWouldEndAt: endsAt }])),
      http.get('*/billing/orders', () => envelope([])),
    );
    renderWith(<BoostsPage />);
    expect(await screen.findByText(/Would run about 2 hours/)).toBeTruthy();
    expect(screen.getByText(/The price is the same however long it runs/)).toBeTruthy();
  });

  it('offers a boost again once the earlier one has ended, even though its order was paid', async () => {
    server.use(
      http.get('*/errands/mine', () => envelope([{ ...open[0], boost: null }])),
      http.get('*/billing/orders', () => envelope([order({ type: 'BOOST', status: 'PAID', errandId: 'e1', paidAt: '2026-10-01T09:00:00Z' })])),
    );
    renderWith(<BoostsPage />);
    expect(await screen.findByRole('button', { name: 'Boost this errand' })).toBeTruthy();
    expect(screen.queryByText(/^Boosted/)).toBeNull();
  });
});

describe('Checkout page', () => {
  it('shows paid when the webhook already settled the order', async () => {
    let verified = false;
    server.use(
      http.get('*/billing/orders/order-1', () => envelope(order({ status: 'PAID', paidAt: '2026-10-15T09:00:00Z' }))),
      http.post('*/billing/orders/order-1/verify', () => { verified = true; return envelope(order({ status: 'PAID' })); }),
    );
    renderWith(<CheckoutPage orderId="order-1" />);
    expect(await screen.findByText('Payment received.')).toBeTruthy();
    expect(verified).toBe(false);
  });

  it('asks the backend to verify a pending order and shows the answer', async () => {
    server.use(
      http.get('*/billing/orders/order-1', () => envelope(order({ status: 'PENDING' }))),
      http.post('*/billing/orders/order-1/verify', () => envelope(order({ status: 'PAID', paidAt: '2026-10-15T09:00:00Z' }))),
    );
    renderWith(<CheckoutPage orderId="order-1" />);
    expect(await screen.findByText('Payment received.')).toBeTruthy();
  });

  it('keeps checking when the payment service is unavailable', async () => {
    server.use(
      http.get('*/billing/orders/order-1', () => envelope(order({ status: 'PENDING' }))),
      http.post('*/billing/orders/order-1/verify', () => apiError(503, 'PAYMENT_PROVIDER_UNAVAILABLE', 'down')),
    );
    renderWith(<CheckoutPage orderId="order-1" />);
    expect(await screen.findByText(/slow to answer/)).toBeTruthy();
  });

  it('shows a failed payment with a way to try again', async () => {
    server.use(http.get('*/billing/orders/order-1', () => envelope(order({ status: 'FAILED' }))));
    renderWith(<CheckoutPage orderId="order-1" />);
    expect(await screen.findByText(/did not go through/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Try Runner Pro again' })).toBeTruthy();
  });
});

describe('Orders', () => {
  it('shows a refunded order as refunded with its VAT line', async () => {
    server.use(http.get('*/billing/orders', () => envelope([order({ status: 'REFUNDED', paidAt: '2026-10-14T09:00:00Z' })])));
    renderWith(<OrdersPage />);
    expect(await screen.findByText('Refunded')).toBeTruthy();
    expect(screen.getByText('VAT included')).toBeTruthy();
  });

  it('says what to do when there are no orders', async () => {
    server.use(http.get('*/billing/orders', () => envelope([])));
    renderWith(<OrdersPage />);
    expect(await screen.findByText('No orders yet')).toBeTruthy();
  });
});
