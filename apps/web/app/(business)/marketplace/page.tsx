import type { Metadata } from 'next';
import { MarketplacePage } from '@/features/marketplace/marketplace-page';

export const metadata: Metadata = {
  title: 'Marketplace — Urgent.ng',
};

export default function MarketplaceRoute() {
  return <MarketplacePage />;
}
