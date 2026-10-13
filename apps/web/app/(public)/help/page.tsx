import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCenter } from './help-center';

export const metadata: Metadata = {
  title: 'Help centre — Urgent.ng',
  description: 'Short answers about payments, offers, safety and your account.',
};

const FLOW = [
  { n: 1, title: 'Agree the price', text: 'Through offers and counter-offers, before anyone is selected.' },
  { n: 2, title: 'Agree how to pay', text: 'Cash, bank transfer or mobile transfer, and when.' },
  { n: 3, title: 'Do the errand', text: 'Follow each step in the app, with photos as evidence.' },
  { n: 4, title: 'Pay the runner', text: 'Directly, as agreed. Then confirm completion and rate each other.' },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 pb-16 pt-6">
      <section className="px-1.5 pb-6 pt-2 text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-green-700">Help centre</p>
        <h1 className="mt-2 text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
          How can we help?
        </h1>
        <p className="mx-auto mt-2.5 max-w-[620px] text-base text-muted">
          Short answers about payments, offers, safety and your account.
        </p>
      </section>

      <section
        id="payments"
        className="mb-4 scroll-mt-24 rounded-[var(--r-lg)] bg-surface p-[22px] shadow-[var(--shadow)]"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">How payments work</h2>
            <p className="text-[12.5px] text-muted">Urgent.ng never touches the money for an errand.</p>
          </div>
          <span className="rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold text-green-900">
            Offline payment
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((step) => (
            <div key={step.n} className="rounded-[var(--r)] bg-panel p-[18px]">
              <span className="grid size-[30px] place-items-center rounded-full bg-ink text-[13px] font-extrabold text-lime">
                {step.n}
              </span>
              <b className="mb-1 mt-2.5 block">{step.title}</b>
              <span className="text-[12.5px] text-muted">{step.text}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--r)] bg-ok-bg p-4 text-[13px] leading-relaxed text-[#145c30]">
            <b>Urgent.ng does</b>
            <br />
            Record the agreed amount and terms, show progress, review reports and disputes, and charge only for
            Runner Pro and boosts.
          </div>
          <div className="rounded-[var(--r)] bg-red-bg p-4 text-[13px] leading-relaxed text-[#8f2a22]">
            <b>Urgent.ng does not</b>
            <br />
            Collect, hold, release or refund errand payments, keep a wallet, or take a cut of what you agree.
          </div>
        </div>
      </section>

      <HelpCenter />

      <section id="about" className="mt-4 rounded-[var(--r-lg)] bg-surface p-[22px] shadow-[var(--shadow)]">
        <h2 className="text-lg font-extrabold tracking-tight">About Urgent.ng</h2>
        <p className="mt-2 leading-[1.7] text-ink-2">
          Urgent.ng helps you get things picked up, delivered or sorted by identity-checked runners nearby, across
          Lagos, Abuja and other Nigerian cities. You agree the price, you see every step, and you pay the runner
          directly.
        </p>
      </section>

      <section
        id="contact"
        className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--r-lg)] bg-gradient-to-br from-[#f1fadb] to-surface p-[22px] shadow-[var(--shadow)]"
      >
        <div className="min-w-0 flex-1">
          <h2 className="mb-1 text-lg font-extrabold tracking-tight">Still need help?</h2>
          <p className="text-muted">
            Signed in? Open Safety &amp; support from your account menu to report a concern or start a dispute. In an
            emergency, contact local emergency services first.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex min-h-[44px] items-center rounded-full bg-surface px-5 text-[13.5px] font-bold shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel"
        >
          Pricing
        </Link>
      </section>
    </div>
  );
}
