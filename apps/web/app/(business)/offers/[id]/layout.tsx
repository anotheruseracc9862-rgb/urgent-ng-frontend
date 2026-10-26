import { OfferJourney } from '@/features/journey/offer-journey';

/** The negotiation screen can show where the errand stands and what happens next. */
export default async function OfferLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfferJourney offerId={id}>{children}</OfferJourney>;
}
