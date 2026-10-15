'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LayoutDashboard, Menu, Plus, User, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@urgent/ui';
import { useViewer } from './use-viewer';

// The account menu (Radix dropdown and popper) loads only for a signed-in viewer, so guests on the
// landing page never download it.
const AccountMenu = dynamic(() => import('./account-menu').then((m) => m.AccountMenu), { ssr: false });

const NAV = [
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#live-errands', label: 'Active Errands' },
  { href: '/#earn-money', label: 'Earn as a Runner' },
  { href: '/#trust-safety', label: 'Safety' },
  { href: '/#faq', label: 'FAQ' },
];

const PILL =
  'inline-flex h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-[18px] text-[13.5px] font-bold transition-[transform,background-color] duration-150 active:scale-[0.98]';

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { viewer, signOut } = useViewer();
  const signedIn = viewer.status === 'user';
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuOpen = useRef(false);

  useEffect(() => {
    menuOpen.current = open;
  }, [open]);

  // Hide on scroll down, show on any scroll up (and always at the top).
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = Math.max(window.scrollY, 0);
      const delta = y - lastY;
      const height = headerRef.current?.offsetHeight ?? 68;

      if (y <= 8) {
        setHidden(false);
      } else if (Math.abs(delta) >= 6) {
        const focusInside = headerRef.current?.contains(document.activeElement) ?? false;
        if (delta > 0 && y > height && !menuOpen.current && !focusInside) setHidden(true);
        else if (delta < 0) setHidden(false);
      }
      lastY = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      ref={headerRef}
      className={cn(
        'sticky top-0 z-50 border-b border-[var(--tu-line)] bg-white transition-transform duration-300 ease-out motion-reduce:transition-none',
        hidden && !open && '-translate-y-full',
      )}
    >
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
          {viewer.status === 'loading' ? (
            <div aria-hidden className="flex items-center gap-2">
              <span className="hidden h-[42px] w-24 animate-pulse rounded-full bg-[#f3f5f2] sm:block" />
              <span className="h-[42px] w-[42px] animate-pulse rounded-full bg-[#f3f5f2] min-[420px]:w-[132px]" />
            </div>
          ) : null}

          {viewer.status === 'guest' ? (
            <>
              <Link href="/login" aria-label="Sign In" className={cn(PILL, 'text-cn-blue-600 hover:bg-[#f3f5f2]')}>
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
              <Link href="/register" aria-label="Post Errand" className={cn(PILL, 'bg-cn-green-500 text-ink hover:bg-cn-green-400')}>
                <Plus className="size-[18px]" strokeWidth={2.4} />
                <span className="hidden min-[420px]:inline">Post Errand</span>
              </Link>
            </>
          ) : null}

          {viewer.status === 'user' ? (
            <>
              <Link
                href="/dashboard"
                className={cn(PILL, 'hidden text-cn-blue-600 hover:bg-[#f3f5f2] sm:inline-flex')}
              >
                <LayoutDashboard className="size-[18px]" />
                Dashboard
              </Link>
              <Link href="/errands/new" aria-label="Post Errand" className={cn(PILL, 'bg-cn-green-500 text-ink hover:bg-cn-green-400')}>
                <Plus className="size-[18px]" strokeWidth={2.4} />
                <span className="hidden min-[420px]:inline">Post Errand</span>
              </Link>
              <AccountMenu name={viewer.me.name} onSignOut={() => void signOut()} />
            </>
          ) : null}
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
          {signedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3.5 py-3 text-[15px] font-semibold text-cn-blue-600 hover:bg-[#f3f5f2] hover:text-ink"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/register?mode=runner"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3.5 py-3 text-[15px] font-semibold text-cn-blue-600 hover:bg-[#f3f5f2] hover:text-ink"
            >
              Become a Runner
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
