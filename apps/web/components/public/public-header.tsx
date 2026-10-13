'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Plus, User, X } from 'lucide-react';
import { cn } from '@urgent/ui';

const NAV = [
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#live-errands', label: 'Active Errands' },
  { href: '/#earn-money', label: 'Earn as a Runner' },
  { href: '/#trust-safety', label: 'Safety' },
  { href: '/#faq', label: 'FAQ' },
];

const PILL =
  'inline-flex h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-[18px] text-[13.5px] font-bold transition-[transform,background-color] duration-150 active:scale-[0.98]';

/** Flat white bar with a hairline, as in demo `.site-header` after touch-up. */
export function PublicHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="relative z-50 border-b border-[var(--tu-line)] bg-white">
      <div className="mx-auto flex h-[62px] w-full max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6 lg:h-[68px]">
        <Link href="/" className="flex shrink-0 items-center" onClick={() => setOpen(false)}>
          <Image
            src="/assets/logo.png"
            alt="Urgent.ng"
            width={140}
            height={34}
            priority
            className="h-[30px] w-auto lg:h-[34px]"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-[15px] py-[9px] text-[13.5px] font-semibold text-cn-blue-600 transition-colors hover:bg-[#f3f5f2] hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(PILL, 'text-cn-blue-600 hover:bg-[#f3f5f2]')}>
            <User className="size-[18px]" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
          <Link
            href="/register"
            className={cn(
              PILL,
              'hidden bg-white text-ink shadow-[inset_0_0_0_1px_rgba(23,33,46,0.12)] hover:bg-[#f3f5f2] md:inline-flex',
            )}
          >
            Sign Up
          </Link>
          <Link href="/register" className={cn(PILL, 'bg-cn-green-500 text-ink hover:bg-cn-green-400')}>
            <Plus className="size-[18px]" strokeWidth={2.4} />
            <span className="hidden min-[420px]:inline">Post Errand</span>
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="grid size-[42px] place-items-center rounded-full bg-[#f3f5f2] text-ink lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="absolute inset-x-0 top-full grid gap-0.5 border-b border-[var(--tu-line)] bg-white px-4 pb-4 pt-3 shadow-[0_18px_30px_-18px_rgba(23,33,46,0.25)] lg:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3.5 py-3 text-[15px] font-semibold text-cn-blue-600 hover:bg-[#f3f5f2] hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/register?mode=runner"
            onClick={() => setOpen(false)}
            className="rounded-xl px-3.5 py-3 text-[15px] font-semibold text-cn-blue-600 hover:bg-[#f3f5f2] hover:text-ink"
          >
            Become a Runner
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
