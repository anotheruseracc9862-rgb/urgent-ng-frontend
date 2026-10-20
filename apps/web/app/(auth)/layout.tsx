import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ShieldCheck, Tag } from 'lucide-react';

/** Split-screen auth layout, ported from demo `.auth` (ui.css). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen gap-4 p-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:p-4">
      <aside className="relative hidden flex-col justify-between self-start overflow-hidden lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] rounded-[var(--r-xl)] bg-[radial-gradient(120%_90%_at_0%_0%,#2d3f12_0%,var(--ink)_55%)] p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[90px] -right-[90px] size-[360px] rounded-full bg-[radial-gradient(circle,rgba(166,212,69,.55),transparent_70%)]"
        />
        <Link href="/" className="relative z-10 w-fit">
          <Image
            src="/assets/logo.png"
            alt="Urgent.ng"
            width={114}
            height={34}
            priority
            className="h-[34px] w-auto brightness-0 invert"
          />
        </Link>
        <div className="relative z-10">
          <h2 className="max-w-[420px] text-[clamp(28px,3.2vw,40px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
            Errands done by people you can <span className="text-lime">trust</span>.
          </h2>
          <ul className="mt-6 grid gap-3.5">
            {[
              { icon: ShieldCheck, text: 'Every runner is ID-checked before they can offer.' },
              { icon: Tag, text: 'Agree the price first. Pay the runner directly.' },
              { icon: MapPin, text: 'Follow progress and share it with someone you trust.' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-[#cfd8c4]">
                <Icon className="mt-0.5 size-[18px] shrink-0 text-lime" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <small className="relative z-10 text-[#9fb08a]">© 2026 Urgent.ng · Lagos</small>
      </aside>

      <main className="grid min-h-[calc(100dvh-1.25rem)] place-items-center rounded-[var(--r-xl)] bg-surface lg:min-h-[calc(100dvh-2rem)] p-5 shadow-[var(--shadow)] sm:p-7">
        <div className="grid w-full max-w-[440px] gap-5">
          <Link href="/" className="w-fit lg:hidden">
            <Image src="/assets/logo.png" alt="Urgent.ng" width={107} height={32} className="h-8 w-auto" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
