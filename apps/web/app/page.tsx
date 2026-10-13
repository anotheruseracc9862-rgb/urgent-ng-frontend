import { Metadata } from 'next';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { HeroSection } from '@/components/landing/hero-section';
import { InstantRequestSection } from '@/components/landing/instant-request-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { LiveErrandsSection } from '@/components/landing/live-errands-section';
import { EarningsSection } from '@/components/landing/earnings-section';
import { TrustSecuritySection } from '@/components/landing/trust-security-section';
import { FaqSection } from '@/components/landing/faq-section';
import { CtaBannerSection } from '@/components/landing/cta-banner-section';

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

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main>
        <HeroSection />
        <InstantRequestSection />
        <HowItWorksSection />
        <LiveErrandsSection />
        <EarningsSection />
        <TrustSecuritySection />
        <FaqSection />
        <CtaBannerSection />
      </main>
      <PublicFooter />
    </>
  );
}
