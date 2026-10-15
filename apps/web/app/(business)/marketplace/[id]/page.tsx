import type { Metadata } from 'next';
import { MarketplaceErrandPage } from '@/features/marketplace/detail/marketplace-errand-page';

export const metadata: Metadata = {
  title: 'Errand details — Urgent.ng',
};

export default async function MarketplaceErrandRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MarketplaceErrandPage errandId={id} />;
}
