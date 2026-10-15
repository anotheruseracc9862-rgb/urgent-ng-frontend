'use client';

import { useSearchParams } from 'next/navigation';
import { MapProvider } from '@/components/map/MapProvider';
import { MarketplaceFeedPage } from './feed/marketplace-feed-page';
import { MarketplaceMapPage } from './map/marketplace-map-page';

export function MarketplacePage() {
  const searchParams = useSearchParams();
  return searchParams.get('view') === 'map'
    ? <MapProvider><MarketplaceMapPage /></MapProvider>
    : <MarketplaceFeedPage />;
}
