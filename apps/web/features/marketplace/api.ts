import type { components } from '@urgent/api-client';
import { api, apiResponse } from '@/lib/api/client';

export type FeedItem = components['schemas']['FeedItemDto'];
export type MarketplaceErrand = components['schemas']['MarketplaceErrandDto'];
export type MapPoint = components['schemas']['MapPointDto'];
export type SavedErrand = components['schemas']['SavedErrandItemDto'];
export type SavedState = components['schemas']['SavedStateDto'];

export type MarketplaceFilters = {
  category?: string[];
  timeMode?: string;
  budgetMin?: number;
  budgetMax?: number;
  radiusKm?: number;
  q?: string;
};

export const marketplaceApi = {
  map: (filters: MarketplaceFilters) =>
    apiResponse<MapPoint[]>('/marketplace/errands/map', { query: { ...filters, limit: 200 } }),
  saved: (cursor?: string) =>
    apiResponse<SavedErrand[]>('/saved-errands', { query: { cursor, limit: 20 } }),
  setSaved: (errandId: string, saved: boolean) =>
    api<SavedState>(`/saved-errands/${errandId}`, { method: saved ? 'POST' : 'DELETE' }),
};
