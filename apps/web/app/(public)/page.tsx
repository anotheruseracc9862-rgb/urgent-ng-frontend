import { Metadata } from 'next';
import { HeroSection } from '@/components/landing/hero-section';
import { InstantRequestSection } from '@/components/landing/instant-request-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { LiveErrandsSection } from '@/components/landing/live-errands-section';
import { EarningsSection } from '@/components/landing/earnings-section';
import { TrustSecuritySection } from '@/components/landing/trust-security-section';
import { FaqSection } from '@/components/landing/faq-section';
import { CtaBannerSection } from '@/components/landing/cta-banner-section';
import { getPopularCategories } from '@/lib/api/reference';

/** Static page that refreshes its category list from the API every five minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Urgent.ng — On-Demand Errand Marketplace in Nigeria',
  description:
    'Get anything picked up, delivered, or sorted in minutes. Connect with verified runners nearby across Lagos, Abuja, and major Nigerian cities with safe pay on delivery.',
  openGraph: {
    title: 'Urgent.ng — On-Demand Errand Marketplace in Nigeria',
    description:
      'Get anything picked up, delivered, or sorted in minutes. Connect with verified runners nearby across Lagos, Abuja, and major Nigerian cities with safe pay on delivery.',
    type: 'website',
    locale: 'en_NG',
    siteName: 'Urgent.ng',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Urgent.ng — On-Demand Errand Marketplace in Nigeria',
    description:
      'Get anything picked up, delivered, or sorted in minutes. Connect with verified runners nearby across Lagos, Abuja, and major Nigerian cities with safe pay on delivery.',
  },
};

export default async function HomePage() {
  const categories = await getPopularCategories();

  return (
    <>
      <HeroSection />
      <InstantRequestSection categories={categories} />
      <HowItWorksSection />
      <LiveErrandsSection />
      <EarningsSection />
      <TrustSecuritySection />
      <FaqSection />
      <CtaBannerSection />
    </>
  );
}

