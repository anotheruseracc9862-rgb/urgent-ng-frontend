const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000/api/v1';

export interface PopularCategory {
  key: string;
  name: string;
  requiresPickup: boolean;
  requiresDestination: boolean;
  isPopular: boolean;
}

/**
 * Popular errand categories for the public landing page (F1-01). Public data, so it is fetched
 * with Next's data cache (the shared `api()` client sends `no-store`, which would make the page
 * dynamic). Returns an empty list when the API is unreachable.
 */
export async function getPopularCategories(): Promise<PopularCategory[]> {
  try {
    const response = await fetch(`${API_URL}/reference/popular-categories`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data?: PopularCategory[] };
    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return [];
  }
}
