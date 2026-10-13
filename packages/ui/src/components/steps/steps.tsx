import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface StepItem {
  label: string;
  description?: string;
}

export interface StepsProps extends React.HTMLAttributes<HTMLOListElement> {
  items: readonly StepItem[];
  currentStep: number;
}

export const Steps = React.forwardRef<HTMLOListElement, StepsProps>(
  ({ className, items, currentStep, ...props }, ref) => (
    <ol
      ref={ref}
      aria-label="Progress"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
      {...props}
    >
      {items.map((step, index) => {
        const completed = index < currentStep;
        const current = index === currentStep;
        const state = completed ? "Completed" : current ? "Current step" : "Upcoming";
        return (
          <li
            key={`${index}-${step.label}`}
            aria-current={current ? "step" : undefined}
            className={cn(
              "flex min-w-0 items-start gap-3 rounded-[var(--r-sm)] border border-line bg-surface p-3",
              current && "border-green bg-tint",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full bg-panel text-sm font-extrabold text-ink-2",
                completed && "bg-ok text-white",
                current && "bg-ink text-lime",
              )}
            >
              {completed ? <Check className="size-4" /> : index + 1}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{state}</span>
              <span className="text-sm font-bold text-ink">{step.label}</span>
              {step.description && <span className="text-xs text-muted">{step.description}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  ),
);
Steps.displayName = "Steps";
