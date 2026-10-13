import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPopularCategories } from '@/lib/api/reference';

/**
 * F1-01: static sections run no client JavaScript. Only the three interactive islands (request
 * form, earnings sliders, errand filter chips) may be Client Components.
 */
const ROOT = path.resolve(__dirname, '../..');
const STATIC = [
  'components/landing/hero-section.tsx',
  'components/landing/how-it-works-section.tsx',
  'components/landing/live-errands-section.tsx',
  'components/landing/earnings-section.tsx',
  'components/landing/trust-security-section.tsx',
  'components/landing/faq-section.tsx',
  'components/landing/cta-banner-section.tsx',
  'components/shared/reveal.tsx',
  'components/shared/section-header.tsx',
  'app/(public)/page.tsx',
];
const ISLANDS = [
  'components/landing/instant-request-section.tsx',
  'components/landing/earnings-calculator.tsx',
  'components/landing/live-errands-feed.tsx',
];

const isClient = (file: string) => /^\s*['"]use client['"]/.test(readFileSync(path.join(ROOT, file), 'utf8'));

describe('landing page client boundary', () => {
  it.each(STATIC)('%s is a Server Component', (file) => {
    expect(isClient(file)).toBe(false);
  });

  it.each(ISLANDS)('%s is an interactive island', (file) => {
    expect(isClient(file)).toBe(true);
  });
});

describe('getPopularCategories()', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the categories from the reference route with a revalidating cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ key: 'delivery', name: 'Delivery' }], meta: {}, requestId: 'r' })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPopularCategories()).resolves.toEqual([{ key: 'delivery', name: 'Delivery' }]);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/reference\/popular-categories$/);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ next: { revalidate: 300 } });
  });

  it('returns an empty list when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('down')));
    await expect(getPopularCategories()).resolves.toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    await expect(getPopularCategories()).resolves.toEqual([]);
  });
});
