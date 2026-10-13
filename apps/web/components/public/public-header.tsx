'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@urgent/ui';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-cn-blue-100 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/assets/logo.png"
                alt="Urgent.ng - Get it fast"
                width={140}
                height={40}
                className="h-8 md:h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link
                href="/#how-it-works"
                className="text-sm font-medium text-cn-blue-700 hover:text-cn-blue-900 transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="/#live-errands"
                className="text-sm font-medium text-cn-blue-700 hover:text-cn-blue-900 transition-colors"
              >
                Active Errands
              </Link>
              <Link
                href="/#earn-money"
                className="text-sm font-medium text-cn-blue-700 hover:text-cn-blue-900 transition-colors"
              >
                Earn as a Runner
              </Link>
              <Link
                href="/#trust-safety"
                className="text-sm font-medium text-cn-blue-700 hover:text-cn-blue-900 transition-colors"
              >
                Safety
              </Link>
              <Link
                href="/#faq"
                className="text-sm font-medium text-cn-blue-700 hover:text-cn-blue-900 transition-colors"
              >
                FAQ
              </Link>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" className="gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Sign In
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="border border-cn-blue-200" asChild>
                <Link href="/register">Sign Up</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register" className="gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Post Errand
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-cn-blue-700 hover:text-cn-blue-900 hover:bg-cn-blue-50 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-full bg-white z-50 lg:hidden shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-cn-blue-100">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <Image
                  src="/assets/logo.png"
                  alt="Urgent.ng"
                  width={120}
                  height={35}
                  className="h-8 w-auto"
                />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-cn-blue-700 hover:bg-cn-blue-50 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="p-4 space-y-2">
              <Link
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-cn-blue-700 hover:bg-cn-blue-50 rounded-lg transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="/#live-errands"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-cn-blue-700 hover:bg-cn-blue-50 rounded-lg transition-colors"
              >
                Active Errands
              </Link>
              <Link
                href="/register?mode=runner"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-cn-blue-700 hover:bg-cn-blue-50 rounded-lg transition-colors"
              >
                Become a Runner
              </Link>
              <Link
                href="/#trust-safety"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-cn-blue-700 hover:bg-cn-blue-50 rounded-lg transition-colors"
              >
                Safety Tips
              </Link>
              <Link
                href="/#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-cn-blue-700 hover:bg-cn-blue-50 rounded-lg transition-colors"
              >
                FAQ
              </Link>
            </nav>

            <div className="p-4 space-y-3 border-t border-cn-blue-100">
              <Button variant="soft" className="w-full" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button variant="ghost" className="w-full border border-cn-blue-200" asChild>
                <Link href="/register">Create Account</Link>
              </Button>
              <Button className="w-full" asChild>
                <Link href="/register">Post Errand</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
