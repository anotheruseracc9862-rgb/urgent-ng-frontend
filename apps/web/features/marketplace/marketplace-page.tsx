'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@urgent/ui';
import { MarketplaceFeedPage } from './feed/marketplace-feed-page';

// The map and its SDK load only when the map view is opened, so the feed's first-load JavaScript
// does not carry them.
const MarketplaceMapView = dynamic(
  () => import('./map/marketplace-map-view').then((module) => module.MarketplaceMapView),
  { ssr: false, loading: () => <Skeleton className="h-96 rounded-[var(--r)]" aria-label="Loading map" /> },
);

export function MarketplacePage() {
  const searchParams = useSearchParams();
  return searchParams.get('view') === 'map' ? <MarketplaceMapView /> : <MarketplaceFeedPage />;
}
