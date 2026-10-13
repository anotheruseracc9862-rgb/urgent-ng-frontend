import { RevealSection } from '@/components/shared/reveal';
import { SectionHeader } from '@/components/shared/section-header';
import { EarningsCalculator } from './earnings-calculator';

export function EarningsSection() {
  return (
    <RevealSection id="earn-money" className="py-16 md:py-24 bg-gradient-to-b from-white to-cn-green-50">
      <div className="mx-auto w-full px-4 max-w-5xl">
        <SectionHeader
          tag="Earn on Your Terms"
          title="Turn Your Free Time into Reliable Daily Income"
          subtitle="Whether you walk, take a bus, ride a bike, or drive, earn by completing quick errands in your neighborhood."
        />

        <EarningsCalculator />
      </div>
    </RevealSection>
  );
}
