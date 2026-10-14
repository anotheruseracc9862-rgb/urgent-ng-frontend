import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { requiredLocations, useCategories, usePolicies, usePopularCategories, useProhibitedItems } from './hooks';

const envelope = <T,>(data: T) => HttpResponse.json({ data, meta: {}, requestId: 'req-reference' });

function renderReferenceHook<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(hook, {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('reference data hooks', () => {
  it('loads typed categories, popular categories, prohibited items, and policies', async () => {
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([
        { key: 'delivery', name: 'Delivery', requiresPickup: true, requiresDestination: true, isPopular: true },
      ])),
      http.get('*/api/v1/reference/popular-categories', () => envelope([
        { key: 'delivery', name: 'Delivery', requiresPickup: true, requiresDestination: true, isPopular: true },
      ])),
      http.get('*/api/v1/reference/prohibited-items', () => envelope([
        { keyword: 'cash', category: 'VALUABLES', description: 'Cash is not allowed.', policyVersion: '1.0' },
      ])),
      http.get('*/api/v1/reference/policies', () => envelope([
        { id: 'terms-1', type: 'TERMS_OF_SERVICE', version: '1.0', documentRef: 'terms', publishedAt: '2026-01-01T00:00:00Z', requiresReacceptance: true },
      ])),
    );

    const categories = renderReferenceHook(useCategories);
    const popular = renderReferenceHook(usePopularCategories);
    const prohibited = renderReferenceHook(useProhibitedItems);
    const policies = renderReferenceHook(usePolicies);

    await waitFor(() => expect(categories.result.current.data?.[0].key).toBe('delivery'));
    await waitFor(() => expect(popular.result.current.data?.[0].isPopular).toBe(true));
    await waitFor(() => expect(prohibited.result.current.data?.[0].keyword).toBe('cash'));
    await waitFor(() => expect(policies.result.current.data?.[0].version).toBe('1.0'));
  });

  it('keeps reference request failures as query errors for callers to render', async () => {
    server.use(http.get('*/api/v1/reference/categories', () => HttpResponse.json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Reference data unavailable.' },
      requestId: 'req-reference-error',
    }, { status: 503 })));

    const categories = renderReferenceHook(useCategories);

    await waitFor(() => expect(categories.result.current.isError).toBe(true));
    expect(categories.result.current.error).toMatchObject({ requestId: 'req-reference-error' });
  });
});

describe('requiredLocations', () => {
  it.each([
    [true, true, { pickup: true, destination: true, onSite: false }],
    [true, false, { pickup: true, destination: false, onSite: false }],
    [false, true, { pickup: false, destination: true, onSite: false }],
    [false, false, { pickup: false, destination: false, onSite: true }],
  ])('maps pickup=%s destination=%s to its location requirements', (requiresPickup, requiresDestination, expected) => {
    expect(requiredLocations({ requiresPickup, requiresDestination })).toEqual(expected);
  });
});
