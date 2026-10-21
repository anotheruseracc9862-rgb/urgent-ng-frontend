import Image from 'next/image';
import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { Button } from '@urgent/ui';

function TaskDoneBadge({ className }: { className?: string }) {
  return (
    <div
      className={`hero-badge flex items-center gap-3.5 rounded-2xl border border-cn-blue-100/85 bg-white px-5 py-3.5 shadow-[0_12px_32px_-4px_rgba(16,21,31,0.14),0_4px_12px_-2px_rgba(16,21,31,0.06)] ${className ?? ''}`}
    >
      <div className="badge-icon grid size-10 shrink-0 place-items-center rounded-full bg-cn-green-100">
        <Check className="size-[18px] text-[#2e5b00]" strokeWidth={3} />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="text-[15px] font-bold leading-tight text-cn-blue-800">Task Done</div>
        <div className="text-xs font-medium leading-snug text-cn-blue-500">Inspect items before payment</div>
      </div>
    </div>
  );
}

/** Full-bleed hero, ported from demo `.hero-section` with its entrance and float effects. */
export function HeroSection() {
  return (
    <section className="relative flex items-center overflow-hidden border-b border-cn-blue-100 bg-white md:min-h-[calc(100dvh-68px)] md:bg-[url('/assets/hero-bg.png')] md:bg-cover md:bg-[position:78%_center] lg:bg-[position:right_center]">
      <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="flex max-w-[540px] flex-col items-start py-12 md:py-16">
          <h1 className="hero-fade-1 mb-[18px] text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-cn-blue-700 sm:text-[38px] lg:text-[46px]">
            Need someone to run an errand?
            <span className="mt-1.5 block text-[#6a9900]">Consider it done.</span>
          </h1>

          <p className="hero-fade-2 mb-8 max-w-[480px] text-base leading-relaxed text-cn-blue-500">
            Connect with verified, trusted runners around you in minutes, to pick something up, deliver it, or come
            and do the job at your place. Set your task, receive competitive price offers, and pay safely only
            after it&apos;s done.
          </p>

          {/* Mobile media: the photo with the badge under it. No entrance animation: it is the LCP element. */}
          <div className="mb-8 w-full md:hidden">
            <Image
              src="/assets/hero-bg.png"
              alt="Trusted errand runner"
              width={720}
              height={480}
              priority
              fetchPriority="high"
              sizes="(max-width: 767px) 100vw, 1px"
              className="h-auto w-full rounded-3xl object-cover"
            />
            <TaskDoneBadge className="mt-4 w-full max-w-[320px]" />
          </div>

          <div className="hero-fade-3 flex flex-wrap items-center gap-3.5">
            <Button size="lg" className="rounded-[10px] px-[26px] text-[15px]" asChild>
              <Link href="/register">
                <Plus className="size-[18px]" strokeWidth={2.5} />
                Post an Errand
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="rounded-lg border border-cn-blue-100 bg-cn-blue-50 px-[26px] text-[15px] hover:bg-cn-blue-100"
              asChild
            >
              <Link href="/register?mode=runner">
                <span aria-hidden>🏍️</span> Become a Runner
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop floating badge, over the photo */}
      <TaskDoneBadge className="absolute right-[3.5%] top-[54%] z-10 hidden md:flex" />
    </section>
  );
}
