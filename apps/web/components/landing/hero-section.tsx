import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@urgent/ui';

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-cn-blue-50 to-white py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-cn-blue-900 leading-tight">
              Need someone to run an errand?{' '}
              <span className="text-cn-green-600">Consider it done.</span>
            </h1>

            <p className="text-lg md:text-xl text-cn-blue-700 leading-relaxed">
              Connect with verified, trusted runners around you in minutes. Set your task,
              receive competitive price offers, and pay safely only after it&apos;s delivered.
            </p>

            {/* Mobile Media - Shows only on mobile */}
            <div className="lg:hidden relative rounded-3xl overflow-hidden">
              <Image
                src="/assets/hero-bg.png"
                alt="Trusted errand runner"
                width={600}
                height={400}
                className="w-full h-auto"
                priority
              />
              {/* Floating Task Done Badge on Mobile */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cn-green-100 flex items-center justify-center">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2e5b00"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-cn-blue-900 text-sm">Task Done</div>
                  <div className="text-xs text-cn-blue-600">
                    Inspect items before payment
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/register">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Post an Errand
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="border border-cn-blue-200" asChild>
                <Link href="/register?mode=runner" className="gap-2">
                  <span>🏍️</span> Become a Runner
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Desktop Image with Floating Badge */}
          <div className="hidden lg:block relative">
            <div className="relative rounded-3xl overflow-hidden">
              <Image
                src="/assets/hero-bg.png"
                alt="Trusted errand runner"
                width={600}
                height={600}
                className="w-full h-auto"
                priority
              />
            </div>
            {/* Desktop Floating Task Done Badge */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-5 shadow-xl flex items-center gap-4 max-w-sm">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-cn-green-100 flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2e5b00"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-cn-blue-900 mb-1">Task Done</div>
                <div className="text-sm text-cn-blue-600">
                  Inspect items before payment
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
