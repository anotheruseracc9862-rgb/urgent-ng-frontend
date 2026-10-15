import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus, Sparkles } from 'lucide-react';
import { api } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pricing — Urgent.ng',
  description: 'Free to use. Pay only if you want more.',
};

interface Product {
  code: string;
  name: string;
  orderType: 'RUNNER_PRO' | 'BOOST' | 'VERIFICATION_FEE' | string;
  priceMinor: number;
  vatMinor: number;
  currency: string;
  periodDays: number | null;
}

/** Null when the API cannot be reached: the page shows no price rather than an invented one. */
async function loadProducts(): Promise<Product[] | null> {
  try {
    return await api<Product[]>('/billing/products/public');
  } catch {
    return null;
  }
}

function naira(minor: number): string {
  return `₦${(minor / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function Feature({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <Check className={`mt-0.5 size-[18px] shrink-0 ${light ? 'text-lime' : 'text-green'}`} strokeWidth={2.5} />
      <span>{children}</span>
    </li>
  );
}

const COMPARE: { label: string; free: React.ReactNode; pro: React.ReactNode }[] = [
  { label: 'Post and manage errands', free: 'yes', pro: 'yes' },
  { label: 'New offers per day', free: '10', pro: 'Unlimited' },
  { label: 'Edit offers and answer counters', free: 'Unlimited', pro: 'Unlimited' },
  { label: 'Early access to new errands', free: 'no', pro: 'yes' },
  { label: 'Pro badge', free: 'no', pro: 'yes' },
  { label: 'Identity verification to send offers', free: 'yes', pro: 'yes' },
];

function Cell({ value }: { value: React.ReactNode }) {
  if (value === 'yes') return <Check className="mx-auto size-[18px] text-ok" strokeWidth={3} aria-label="Included" />;
  if (value === 'no') return <Minus className="mx-auto size-[18px] text-faint" aria-label="Not included" />;
  return <span className="font-bold text-ok">{value}</span>;
}

export default async function PricingPage() {
  const products = await loadProducts();
  const pro = products?.find((p) => p.orderType === 'RUNNER_PRO');
  const boost = products?.find((p) => p.orderType === 'BOOST');

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-6">
      <section className="px-1.5 pb-8 pt-2 text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-green-700">Runner Pro &amp; pricing</p>
        <h1 className="mt-2 text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
          Free to use. Pay only if you want more.
        </h1>
        <p className="mx-auto mt-2.5 max-w-[620px] text-base text-muted">
          Posting errands and sending offers are free. Errand payments go straight from requester to runner, so we
          never take a cut.
        </p>
      </section>

      {products === null ? (
        <p role="status" className="mb-4 rounded-[var(--r)] bg-amber-bg px-4 py-3 text-center text-sm text-[#7a4800]">
          Prices are not available right now. Please check back in a moment.
        </p>
      ) : null}

      <div className="grid items-stretch gap-4 md:grid-cols-3">
        <section id="errand-boost" className="flex flex-col gap-[18px] rounded-[var(--r-xl)] bg-surface p-7 shadow-[var(--shadow)]">
          <div>
            <span className="inline-flex rounded-full bg-panel px-2.5 py-1 text-[11.5px] font-bold text-ink-2">Free</span>
          </div>
          <div>
            <div className="text-[40px] font-extrabold leading-none tracking-[-0.04em]">₦0</div>
            <div className="mt-2 text-[13px] text-muted">For everyone</div>
          </div>
          <ul className="grid flex-1 gap-3">
            <Feature>Post errands and review offers</Feature>
            <Feature>10 new offers per day as a runner</Feature>
            <Feature>Editing offers and counters never use your daily count</Feature>
            <Feature>Chat, progress updates and trusted-contact links</Feature>
          </ul>
          <Link
            href="/register"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-surface text-[13.5px] font-bold shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-panel"
          >
            Create free account
          </Link>
        </section>

        <section className="relative flex flex-col gap-[18px] rounded-[var(--r-xl)] bg-ink p-7 text-white shadow-[var(--shadow)]">
          <span className="absolute right-5 top-5 rounded-full bg-[#26323f] px-2.5 py-1 text-[11.5px] font-bold">
            Most popular
          </span>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold text-green-900">
              <Sparkles className="size-3" /> Runner Pro
            </span>
          </div>
          <div>
            <div className="text-[40px] font-extrabold leading-none tracking-[-0.04em]">
              {pro ? naira(pro.priceMinor) : '—'}{' '}
              <small className="text-sm font-semibold tracking-normal text-[#aeb8c6]">
                / {pro?.periodDays ?? 30} days
              </small>
            </div>
            <div className="mt-2 text-[13px] text-[#c9d2de]">
              {pro && pro.vatMinor > 0 ? `Includes ${naira(pro.vatMinor)} VAT. ` : ''}Cancel any time.
            </div>
          </div>
          <ul className="grid flex-1 gap-3 text-[#c9d2de]">
            <Feature light>Unlimited new offers</Feature>
            <Feature light>See new errands a few minutes before everyone else</Feature>
            <Feature light>Pro badge on every offer</Feature>
            <Feature light>Everything in Free</Feature>
          </ul>
          <Link
            href="/pro"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-lime text-[13.5px] font-bold text-ink transition-colors hover:bg-lime-600"
          >
            Get Runner Pro
          </Link>
        </section>

        <section className="flex flex-col gap-[18px] rounded-[var(--r-xl)] bg-surface p-7 shadow-[var(--shadow)]">
          <div>
            <span className="inline-flex rounded-full bg-amber-bg px-2.5 py-1 text-[11.5px] font-bold text-amber">
              Errand boost
            </span>
          </div>
          <div>
            <div className="text-[40px] font-extrabold leading-none tracking-[-0.04em]">
              {boost ? naira(boost.priceMinor) : '—'}{' '}
              <small className="text-sm font-semibold tracking-normal text-muted">per errand</small>
            </div>
            <div className="mt-2 text-[13px] text-muted">One-time, for a limited time and never past the errand’s own deadline</div>
          </div>
          <ul className="grid flex-1 gap-3">
            <Feature>Higher placement in the runner feed</Feature>
            <Feature>Only for open errands</Feature>
            <Feature>Existing offers and agreed amounts do not change</Feature>
            <Feature>Separate from the errand amount</Feature>
          </ul>
          <Link
            href="/boosts"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-surface text-[13.5px] font-bold shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-panel"
          >
            Boost an errand
          </Link>
        </section>
      </div>

      <section className="mt-4 rounded-[var(--r-lg)] bg-surface p-[22px] shadow-[var(--shadow)]">
        <h2 className="mb-4 text-base font-extrabold tracking-tight">Compare</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-muted">
                <th className="py-2.5 pr-3">What you get</th>
                <th className="px-3 py-2.5 text-center">Free</th>
                <th className="px-3 py-2.5 text-center">Runner Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.label} className="border-b border-line-2 last:border-0">
                  <td className="py-3 pr-3 font-semibold">{row.label}</td>
                  <td className="px-3 py-3 text-center">
                    <Cell value={row.free} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Cell value={row.pro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--r-lg)] bg-gradient-to-br from-[#f1fadb] to-surface p-[22px] shadow-[var(--shadow)]">
        <div className="min-w-0 flex-1">
          <h2 className="mb-1 text-lg font-extrabold tracking-tight">What about the errand itself?</h2>
          <p className="text-muted">
            The price is whatever you and the runner agree. You pay the runner directly. Urgent.ng does not collect,
            hold or release it, and takes no cut.
          </p>
        </div>
        <Link
          href="/help#payments"
          className="inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#0f1822]"
        >
          How payments work
        </Link>
      </section>
    </div>
  );
}
