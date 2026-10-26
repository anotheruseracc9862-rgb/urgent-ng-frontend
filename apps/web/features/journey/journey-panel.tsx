'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
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

/**
 * The steps of the errand and where this person is. From `sm` up it is the whole bar. On a phone it is
 * one pill, "Step 2 of 6: Negotiate", and tapping it lists every step. Every page that shows the
 * steps (errand, offer, assignment) uses this one component.
 */
export function JourneyPanel({ view, className = '' }: { view: JourneyView; className?: string }) {
  const { steps, stage } = view;
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const current = steps[stage];

  return (
    <nav aria-label="Errand progress" className={`rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px] ${className}`}>
      <div className="sm:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-full bg-panel px-4 text-left text-xs font-bold text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
        >
          <span className="min-w-0 truncate">
            Step {stage + 1} of {steps.length}: <span className={current.state === 'stopped' ? 'text-red' : 'text-ink'}>{current.label}</span>
            <span className="sr-only">. {open ? 'Hide' : 'Show'} all steps</span>
          </span>
          <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-ink transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
        </button>
        {open ? (
          <ol id={listId} className="mt-3 grid gap-1">
            {steps.map((step, index) => (
              <li
                key={step.key}
                aria-current={step.state === 'current' || step.state === 'stopped' ? 'step' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-full px-2 ${step.state === 'current' ? 'bg-tint' : ''}`}
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${dotStyle[step.state]}`}>
                  {step.state === 'done' ? <Check aria-hidden="true" className="size-3.5" /> : step.state === 'stopped' ? <X aria-hidden="true" className="size-3.5" /> : index + 1}
                </span>
                <span className={`text-sm font-bold ${textStyle[step.state]}`}>
                  {step.label}
                  <span className="sr-only">{hint[step.state]}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
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
