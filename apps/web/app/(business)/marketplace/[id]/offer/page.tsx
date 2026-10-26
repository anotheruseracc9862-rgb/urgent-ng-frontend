import type { Metadata } from 'next';
import { SubmitOfferPage } from '@/features/offers/submit/submit-offer-page';

export const metadata: Metadata = {
  title: 'Send an Offer — Urgent.ng',
};

export default async function SubmitOfferRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubmitOfferPage errandId={id} />;
}
