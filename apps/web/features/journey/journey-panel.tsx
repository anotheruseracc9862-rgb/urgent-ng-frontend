'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Check, Clock3, Eye, Flag, Sparkles, X } from 'lucide-react';
import type { JourneyView, NextTone, StepState } from './journey';

const toneStyle: Record<NextTone, { badge: string; label: string; Icon: typeof Clock3 }> = {
  action: { badge: 'bg-amber-bg text-amber', label: 'Your move', Icon: Sparkles },
  wait: { badge: 'bg-blue-bg text-blue', label: 'Waiting', Icon: Clock3 },
  done: { badge: 'bg-ok-bg text-ok', label: 'Done', Icon: Check },
  stopped: { badge: 'bg-red-bg text-red', label: 'Stopped', Icon: Flag },
};

const dotStyle: Record<StepState, string> = {
  done: 'bg-green-700 text-white',
  current: 'bg-lime text-ink ring-4 ring-tint-2',
  stopped: 'bg-red text-white',
  upcoming: 'bg-panel text-muted',
};

const textStyle: Record<StepState, string> = {
  done: 'text-green-800',
  current: 'text-ink',
  stopped: 'text-red',
  upcoming: 'text-muted',
};

/**
 * The same bar and "what happens next" card on every screen of an errand's journey, so a person
 * always knows where they are, what to do, and what the other side sees.
 */
export function JourneyPanel({ view, otherRole, className = 'mb-4' }: { view: JourneyView; otherRole: 'requester' | 'runner'; className?: string }) {
  const pathname = usePathname();
  const { steps, next, stage } = view;
  const tone = toneStyle[next.tone];
  const showCta = next.cta && next.cta.href !== pathname;
  const current = steps[stage];

  return (
    <section aria-label="Errand progress" className={`mx-auto ${className} grid max-w-5xl gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]`}>
      {/* Phone: one line. From sm up: the whole bar. */}
      <p className="text-xs font-bold text-muted sm:hidden" aria-hidden="true">
        Step {stage + 1} of {steps.length}: <span className="text-ink">{current.label}</span>
      </p>
      <ol className="hidden grid-cols-7 gap-1 sm:grid">
        {steps.map((step, index) => (
          <li key={step.key} aria-current={step.state === 'current' || step.state === 'stopped' ? 'step' : undefined} className="grid min-w-0 justify-items-center gap-2 text-center">
            <span className="relative grid w-full place-items-center">
              {index > 0 ? <span aria-hidden="true" className={`absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2 ${index <= stage ? 'bg-green-700' : 'bg-line'}`} /> : null}
              <span className={`relative grid size-7 place-items-center rounded-full text-[11px] font-extrabold ${dotStyle[step.state]}`}>
                {step.state === 'done' ? <Check aria-hidden="true" className="size-3.5" /> : step.state === 'stopped' ? <X aria-hidden="true" className="size-3.5" /> : index + 1}
              </span>
            </span>
            <span className={`text-[11px] font-bold leading-tight ${textStyle[step.state]}`}>
              {step.label}
              <span className="sr-only">{step.state === 'done' ? ' (done)' : step.state === 'current' ? ' (now)' : step.state === 'stopped' ? ' (stopped)' : ''}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 rounded-[var(--r)] bg-tint p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${tone.badge}`}>
              <tone.Icon aria-hidden="true" className="size-3.5" />{tone.label}
            </span>
            <h2 className="text-base font-extrabold tracking-tight text-ink">{next.title}</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{next.body}</p>
          {showCta ? (
            <Link href={next.cta!.href} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-lime px-4 text-sm font-extrabold text-ink hover:bg-lime-600">
              {next.cta!.label}<ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </div>
        <div className="rounded-[var(--r-sm)] bg-surface/70 p-3 text-xs leading-relaxed text-ink-2">
          <p className="flex items-center gap-1.5 font-extrabold text-ink"><Eye aria-hidden="true" className="size-3.5" />What the {otherRole} sees</p>
          <p className="mt-1">{next.other}</p>
        </div>
      </div>
    </section>
  );
}
