/** The five milestones of a running errand, as the demo shows them. */
export const EXECUTION_STEPS = ['Accepted', 'Started', 'Picked up', 'Delivered', 'Done'] as const;

/**
 * Which milestone an errand is at, from its status. -1 means it has not been accepted yet, so no
 * milestone is reached. A disputed errand is shown at Delivered, where disputes happen.
 */
export function executionStage(errandStatus: string): number {
  switch (errandStatus) {
    case 'ACCEPTED':
      return 0;
    case 'IN_PROGRESS':
      return 1;
    case 'PICKED_UP':
      return 2;
    case 'DELIVERED':
    case 'DISPUTED':
      return 3;
    case 'COMPLETED':
      return 4;
    default:
      return -1;
  }
}

/** The label and tone for the badge at the top of a task card. */
export function stageBadge(errandStatus: string, pendingAcceptance: boolean): { label: string; className: string } {
  if (pendingAcceptance) return { label: 'Waiting for your answer', className: 'bg-amber-bg text-amber' };
  if (errandStatus === 'DISPUTED') return { label: 'Disputed', className: 'bg-red-bg text-red' };
  const stage = executionStage(errandStatus);
  if (stage === 4) return { label: 'Done', className: 'bg-ok-bg text-ok' };
  return { label: stage >= 0 ? EXECUTION_STEPS[stage] : errandStatus.toLowerCase().replaceAll('_', ' '), className: 'bg-blue-bg text-blue' };
}

/** Five segments: reached ones lime, the current one ink, the rest grey. */
export function ExecutionProgress({ errandStatus, className = '' }: { errandStatus: string; className?: string }) {
  const stage = executionStage(errandStatus);
  return (
    <ol aria-label="Errand progress" className={`grid grid-cols-5 gap-1.5 ${className}`}>
      {EXECUTION_STEPS.map((step, index) => {
        const state = index < stage || stage === 4 ? 'done' : index === stage ? 'now' : 'later';
        return (
          <li key={step} aria-current={state === 'now' ? 'step' : undefined} className="grid min-w-0 gap-1.5">
            <span aria-hidden="true" className={`h-1.5 rounded-full ${state === 'done' ? 'bg-lime-600' : state === 'now' ? 'bg-ink' : 'bg-line'}`} />
            <span className={`truncate text-[11px] ${state === 'now' ? 'font-extrabold text-ink' : 'font-bold text-muted'}`}>
              {step}
              <span className="sr-only">{state === 'done' ? ' (done)' : state === 'now' ? ' (now)' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Pickup and drop-off, joined by the dots from the demo. Approximate areas unless exact ones are given. */
export function RouteBlock({ from, to }: { from: string | null; to: string | null }) {
  return (
    <div className="grid gap-2 rounded-[var(--r-sm)] bg-panel p-3 text-sm text-ink-2">
      <p className="flex items-center gap-2.5">
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-lime-600" />
        <span className="sr-only">Pickup: </span>
        <span className="min-w-0 break-words">{from ?? 'Pickup area not shared'}</span>
      </p>
      <p className="flex items-center gap-2.5">
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-ink" />
        <span className="sr-only">Drop-off: </span>
        <span className="min-w-0 break-words">{to ?? 'Drop-off area not shared'}</span>
      </p>
    </div>
  );
}
