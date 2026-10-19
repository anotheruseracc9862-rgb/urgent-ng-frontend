'use client';

import { Check, X } from 'lucide-react';
import type { JourneyView, StepState } from './journey';

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

const hint: Record<StepState, string> = { done: ' (done)', current: ' (now)', stopped: ' (stopped)', upcoming: '' };

/** The steps of the errand and where this person is. Nothing else: no text, no buttons. */
export function JourneyPanel({ view, className = '' }: { view: JourneyView; className?: string }) {
  const { steps, stage } = view;

  return (
    <nav aria-label="Errand progress" className={`rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] ${className}`}>
      {/* Phone: one line. From sm up: the whole bar. */}
      <p className="text-xs font-bold text-muted sm:hidden" aria-hidden="true">
        Step {stage + 1} of {steps.length}: <span className={steps[stage].state === 'stopped' ? 'text-red' : 'text-ink'}>{steps[stage].label}</span>
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
              <span className="sr-only">{hint[step.state]}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
