import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Me } from '@/lib/api/types';
import { SessionProvider } from '@/lib/auth/client';
import { listen, server } from '@/test/msw/server';
import { LoginForm } from '@/features/auth/login-form';
import { RegisterForm } from '@/features/auth/register-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/script', () => ({ default: () => null }));

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

describe('axe: no serious or critical violations on the sign-in flows', () => {
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
});
