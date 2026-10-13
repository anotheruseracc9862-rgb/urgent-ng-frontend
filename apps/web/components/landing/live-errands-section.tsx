import Link from 'next/link';
import { Button } from '@urgent/ui';
import { RevealSection } from '@/components/shared/reveal';
import { SectionHeader } from '@/components/shared/section-header';
import { LiveErrandsFeed } from './live-errands-feed';

export function LiveErrandsSection() {
  return (
    <RevealSection id="live-errands" className="border-y border-cn-blue-100 bg-[#fbfbfb] py-16 md:py-24">
      <div className="mx-auto w-full max-w-7xl px-4">
        <SectionHeader
          tag="Marketplace Feed"
          title="Active Errands Happening Now"
          subtitle="Real errands posted by everyday people and businesses across Nigeria. See what's moving right now."
        />

        <LiveErrandsFeed />

        <div className="text-center">
          <Button size="lg" variant="ghost" asChild>
            <Link href="/register">View More →</Link>
          </Button>
        </div>
      </div>
    </RevealSection>
  );
}
