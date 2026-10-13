import Link from 'next/link';
import { Button } from '@urgent/ui';
import { RevealSection } from '@/components/shared/reveal';

export function CtaBannerSection() {
  return (
    <RevealSection className="py-16 md:py-24 bg-white">
      <div className="mx-auto w-full px-4 max-w-5xl">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-cn-blue-800 to-cn-blue-900 p-8 text-center text-white shadow-xl md:p-12">
          <div aria-hidden className="pointer-events-none absolute -top-1/2 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(147,199,0,0.25)_0%,transparent_70%)]" />
          <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to get that urgent task sorted today?
          </h2>
          <p className="text-lg text-cn-blue-200 mb-8 max-w-2xl mx-auto">
            Stop stressing over Lagos traffic and endless calls. Post your errand in 60 seconds
            and let trusted nearby runners handle the rest.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="primary"
              asChild
            >
              <Link href="/register">Post an Errand Now →</Link>
            </Button>
            <Button
              size="lg"
              variant="soft"
              className="border border-white/25 bg-white/10 text-white hover:bg-white/20"
              asChild
            >
              <Link href="/register?mode=runner">Browse &amp; Earn Money →</Link>
            </Button>
          </div>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
