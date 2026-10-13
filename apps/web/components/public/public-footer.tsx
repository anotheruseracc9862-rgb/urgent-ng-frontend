import Image from 'next/image';
import Link from 'next/link';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Marketplace',
    links: [
      { href: '/login', label: 'Sign in to your workspace' },
      { href: '/register', label: 'Post an Errand' },
      { href: '/#earn-money', label: 'Runner Earnings' },
      { href: '/pricing', label: 'Runner Pro & Pricing' },
    ],
  },
  {
    title: 'Safety & Trust',
    links: [
      { href: '/#trust-safety', label: 'Safety & Pay-on-Delivery Tips' },
      { href: '/#faq', label: 'Dispute Resolution FAQ' },
      { href: "/help#payments", label: "How payments work" },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/help', label: 'Help Centre' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/help', label: 'Contact Support' },
    ],
  },
];

/** Dark footer, ported from demo `.site-footer`. */
export function PublicFooter() {
  return (
    <footer className="border-t border-cn-blue-800 bg-cn-blue-900 pb-8 pt-16 text-cn-blue-300 md:pt-20">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <div className="mb-12 grid gap-10 sm:grid-cols-2 lg:mb-16 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-12">
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="w-fit rounded-[10px] bg-white px-3 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
              <Image src="/assets/logo.png" alt="Urgent.ng" width={160} height={40} className="h-[38px] w-auto" />
            </Link>
            <p className="max-w-[320px] text-sm leading-relaxed">
              Nigeria&apos;s trusted peer-to-peer errand marketplace. Connecting people with tasks to available
              runners nearby with safe pay on delivery.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.06em] text-white">{column.title}</h4>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-cn-blue-300 transition-colors hover:text-cn-green-400">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-cn-blue-800 pt-6 text-[13px] text-cn-blue-400 sm:flex-row sm:items-center">
          <span>&copy; 2026 Urgent.ng Technologies Limited. All rights reserved.</span>
          <span>Lagos • Abuja • Port Harcourt • Ibadan</span>
        </div>
      </div>
    </footer>
  );
}
