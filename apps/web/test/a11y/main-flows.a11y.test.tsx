import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Me } from '@/lib/api/types';
import { SessionProvider } from '@/lib/auth/client';
import { listen, server } from '@/test/msw/server';
import { BoostsPage } from '@/features/billing/boosts-page';
import { CheckoutPage } from '@/features/billing/checkout-page';
import { OrdersPage } from '@/features/billing/orders-page';
import { ProPage } from '@/features/billing/pro-page';
import { LoginForm } from '@/features/auth/login-form';
import { RegisterForm } from '@/features/auth/register-form';
import { ConversationThreadPage } from '@/features/messaging/conversation-thread-page';
import { ConversationListPage } from '@/features/messaging/conversation-list-page';
import { NotificationsPage } from '@/features/notifications/notifications-page';
import { VerificationPage } from '@/features/verification/verification-page';
import { SafetyCenterPage } from '@/features/safety/safety-center-page';
import { PostErrandForm } from '@/features/errands/post-form/post-errand-form';
import { AssignmentHubPage } from '@/features/assignments/hub/assignment-hub-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@/components/media/MediaUpload', () => ({ MediaUpload: () => null }));
vi.mock('@/components/media-upload/media-upload', () => ({ MediaUpload: () => null }));
vi.mock('@/lib/google-maps', () => ({ loadGoogleMaps: () => Promise.reject(new Error('not configured')) }));
vi.mock('@/features/blocks/block-user-button', () => ({ BlockUserButton: () => <button type="button">Block</button> }));

const me = { id: 'u1', firstName: 'Ada', lastName: 'Obi', name: 'Ada Obi', phoneVerified: true, status: 'ACTIVE' } as unknown as Me;
const envelope = (data: unknown, meta: unknown = {}) => HttpResponse.json({ data, meta, requestId: 'req-a11y' });

/**
 * jsdom has no layout, so colour contrast cannot be measured here. Contrast is checked by token
 * in the design system review; everything else axe can see in markup is asserted.
 */
async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help} -> ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`);
}

function renderPage(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider me={me}>{node}</SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());

const POLICIES = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'SAFETY_POLICY', 'PROHIBITED_ITEMS_POLICY', 'OFFLINE_PAYMENT_TERMS']
  .map((type) => ({ type, version: '2026-01', publishedAt: '2026-01-01T00:00:00.000Z' }));

const conversation = {
  id: 'c1', errandId: 'e1', errandTitle: 'Pick up parcel', muted: false, canSend: true, readOnlyReason: null,
  unreadCount: 1, lastMessageAt: '2026-10-15T08:00:00Z', createdAt: '2026-10-15T08:00:00Z',
  counterpart: { userId: 'u2', firstName: 'Tobi', lastName: 'Ade', photoMediaId: null, role: 'RUNNER', rating: 4.9, ratingCount: 12 },
  lastMessagePreview: 'On my way', errandStatus: 'IN_PROGRESS', amountMinor: 300_000, amountKind: 'AGREED', pickupArea: 'Yaba', destinationArea: 'Ikeja', assignmentId: 'a1',
};
const order = {
  id: 'o1', type: 'RUNNER_PRO', status: 'PAID', amountMinor: 500000, vatMinor: 34884, currency: 'NGN',
  errandId: null, payment: null, paidAt: '2026-10-15T08:00:00Z', createdAt: '2026-10-15T08:00:00Z',
};

describe('axe: no serious or critical violations on the main flows', () => {
  it('login', async () => {
    const { container } = renderPage(<LoginForm />);
    await screen.findByRole('button', { name: /sign in|log in|continue/i });
    expect(await violations(container)).toEqual([]);
  });

  it('register', async () => {
    server.use(http.get('*/reference/policies', () => envelope(POLICIES)));
    const { container } = renderPage(<RegisterForm />);
    await screen.findByLabelText('Full name');
    expect(await violations(container)).toEqual([]);
  });

  it('verification', async () => {
    server.use(http.get('*/verification', () => envelope({
      status: 'NOT_STARTED', displayStatus: 'NOT_STARTED', expiresAt: null, latestAttempt: null, nextAttemptAt: null,
      verified: false, phoneVerified: true, attemptsRemaining: 3, feeRequired: false, canStart: true,
    })));
    const { container } = renderPage(<VerificationPage />);
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(container.querySelector('form')).not.toBeNull());
    expect(await violations(container)).toEqual([]);
  });

  it('chat list and thread', async () => {
    server.use(
      http.get('*/conversations', () => envelope([conversation])),
      http.get('*/conversations/c1', () => envelope(conversation)),
      http.get('*/conversations/c1/messages', () => envelope([
        { id: 'm1', conversationId: 'c1', senderId: 'u2', type: 'TEXT', body: 'Hello', status: 'SENT', createdAt: '2026-10-15T08:00:00Z' },
        { id: 'm2', conversationId: 'c1', senderId: 'u1', type: 'TEXT', body: 'Hi', status: 'READ', createdAt: '2026-10-15T08:01:00Z' },
      ])),
      http.post('*/conversations/c1/read', () => envelope({ marked: 1 })),
    );
    const list = renderPage(<ConversationListPage />);
    await screen.findByText('Pick up parcel');
    expect(await violations(list.container)).toEqual([]);
    list.unmount();

    const thread = renderPage(<ConversationThreadPage conversationId="c1" />);
    await screen.findByText('Hello');
    expect(await violations(thread.container)).toEqual([]);
  });

  it('notifications', async () => {
    server.use(http.get('*/notifications', () => envelope([
      { id: 'n1', category: 'MARKETPLACE', type: 'offer.new', title: 'New offer', body: 'Tobi offered', data: { offerId: 'o1' }, readAt: null, createdAt: '2026-10-15T08:00:00Z' },
    ])));
    const { container } = renderPage(<NotificationsPage />);
    await screen.findByText('New offer');
    expect(await violations(container)).toEqual([]);
  });

  it('Runner Pro, boosts, orders and checkout', async () => {
    server.use(
      http.get('*/billing/products', () => envelope([
        { code: 'RUNNER_PRO', name: 'Runner Pro', orderType: 'RUNNER_PRO', priceMinor: 500000, vatMinor: 34884, currency: 'NGN', periodDays: 30 },
      ])),
      http.get('*/subscriptions/pro', () => envelope({ active: false, status: 'NONE', currentPeriodEnd: null, graceEndsAt: null, autoRenew: false, cancelledAt: null })),
      http.get('*/errands/mine', () => envelope([{ id: 'e1', title: 'Collect parcel', status: 'OPEN' }])),
      http.get('*/billing/orders', () => envelope([order])),
      http.get('*/billing/orders/o1', () => envelope(order)),
    );
    const pro = renderPage(<ProPage />);
    await screen.findByRole('button', { name: 'Continue to payment' });
    expect(await violations(pro.container)).toEqual([]);
    pro.unmount();

    const boosts = renderPage(<BoostsPage />);
    await screen.findByText('Collect parcel');
    expect(await violations(boosts.container)).toEqual([]);
    boosts.unmount();

    const orders = renderPage(<OrdersPage />);
    await screen.findByText('Orders and receipts');
    await screen.findAllByText('Paid');
    expect(await violations(orders.container)).toEqual([]);
    orders.unmount();

    const checkout = renderPage(<CheckoutPage orderId="o1" />);
    await screen.findByText('Payment received.');
    expect(await violations(checkout.container)).toEqual([]);
  });

  it('safety center', async () => {
    const { container } = renderPage(<SafetyCenterPage />);
    await screen.findByRole('heading', { level: 1 });
    expect(await violations(container)).toEqual([]);
  });

  it('post errand', async () => {
    server.use(
      http.get('*/reference/categories', () => envelope([
        { id: 'a7f7d3de-27a1-4a23-a67b-6e69c03ce541', key: 'on_site', name: 'On-site help', requiresPickup: false, requiresDestination: false, isPopular: true },
      ])),
      http.get('*/me/consents', () => envelope({ consents: [] })),
    );
    const { container } = renderPage(<PostErrandForm />);
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(container.querySelector('form')).not.toBeNull());
    expect(await violations(container)).toEqual([]);
  });

  it('assignment hub', async () => {
    server.use(
      http.get('*/assignments/a1', () => envelope({
        id: 'a1', errandId: 'e1', offerId: 'o1', requesterId: 'u1', runnerId: 'u2', status: 'ACCEPTED',
        agreedAmountMinor: 550000, currency: 'NGN', selectedAt: '2026-01-01T09:00:00.000Z',
        acceptanceDeadline: '2026-01-01T09:30:00.000Z', acceptedAt: '2026-01-01T09:10:00.000Z', version: 2, role: 'REQUESTER',
        errand: {
          id: 'e1', status: 'PICKED_UP', version: 3, category: {}, title: 'Collect a parcel', description: 'Collect it.',
          instructions: null, priority: 'STANDARD', timeMode: 'ASAP', scheduledAt: null, itemSize: null, itemValueMinor: null,
          pickup: { area: 'Yaba', lga: 'Lagos Mainland', state: 'Lagos' }, destination: { area: 'Ikeja', lga: 'Ikeja', state: 'Lagos' },
          pickupContact: null, dropoffContact: null, photos: [], expiresAt: null, autoCompleteAt: null, accessLevel: 'EXACT',
        },
      })),
      http.get('*/assignments/a1/timeline', () => envelope([])),
    );
    const { container } = renderPage(<AssignmentHubPage assignmentId="a1" />);
    await screen.findByText('Collect a parcel');
    expect(await violations(container)).toEqual([]);
  });
});
