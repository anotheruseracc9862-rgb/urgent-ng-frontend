import Link from 'next/link';
import { Button } from '@urgent/ui';

export function CtaBannerSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-gradient-to-br from-cn-green-600 to-cn-green-700 rounded-3xl p-8 md:p-12 text-center shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to get that urgent task sorted today?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Stop stressing over Lagos traffic and endless calls. Post your errand in 60 seconds
            and let trusted nearby runners handle the rest.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="ghost"
              className="bg-white text-cn-green-700 hover:bg-white/90 border border-white"
              asChild
            >
              <Link href="/register">Post an Errand Now →</Link>
            </Button>
            <Button
              size="lg"
              variant="soft"
              className="text-white hover:bg-white/10 border border-white/30 bg-white/20"
              asChild
            >
              <Link href="/marketplace">Browse &amp; Earn Money →</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
