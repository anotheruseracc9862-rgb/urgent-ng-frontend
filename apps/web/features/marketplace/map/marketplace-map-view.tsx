'use client';

import { MapProvider } from '@/components/map/MapProvider';
import { MarketplaceMapPage } from './marketplace-map-page';

export function MarketplaceMapView() {
  return <MapProvider><MarketplaceMapPage /></MapProvider>;
}
