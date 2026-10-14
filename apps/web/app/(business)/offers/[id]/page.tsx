import type { Metadata } from 'next';
import { OfferNegotiationPage } from '@/features/offers/negotiation/offer-negotiation-page';

export const metadata: Metadata = {
  title: 'Offer Negotiation — Urgent.ng',
};

export default async function OfferNegotiationRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfferNegotiationPage offerId={id} />;
}
