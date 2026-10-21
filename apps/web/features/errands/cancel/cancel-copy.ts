import type { components } from '@urgent/api-client';
import { isApiError } from '@/lib/api/client';
import { CANCEL_BLOCKED, flowOf } from '@/features/reference/flow';

type Errand = components['schemas']['ErrandDto'];

/** What cancelling does at each stage, in words for the confirmation. */
export function consequence(status: Errand['status'], service: boolean): string {
  switch (status) {
    case 'DRAFT': return 'The draft is closed and will no longer appear in your active drafts.';
    case 'OPEN': return 'The errand and its offers will close. No runner has been selected.';
    case 'RUNNER_SELECTED': return 'The selected runner will be notified. The selection and cancellation reason will be recorded.';
    case 'ACCEPTED': return 'The accepted runner will be notified and the reason will be recorded.';
    case 'IN_PROGRESS': return 'This is recorded as a late cancellation and may affect account reliability.';
    case 'PICKED_UP': return service ? 'Cancellation is not available once the work has started. Open a dispute if something is wrong.' : 'Cancellation is not available after pickup. Open a dispute if something is wrong.';
    case 'DELIVERED': return service ? 'Cancellation is not available once the work is finished. Confirm completion or open a dispute.' : 'Cancellation is not available after delivery. Confirm completion or open a dispute.';
    case 'DISPUTED': return 'This errand is already under review. Continue in the assignment hub.';
    default: return 'This errand is already closed.';
  }
}

/** The answer to a cancel that the server refused or could not finish. */
export function cancellationError(error: unknown, flow?: Parameters<typeof flowOf>[0]): string {
  const blocked = CANCEL_BLOCKED[flowOf(flow)];
  if (!isApiError(error)) return 'We could not cancel this errand. Please try again.';
  if (error.status >= 500) return 'Something went wrong on our side, and the errand was not cancelled. Try again in a moment.';
  if (error.code === 'ERRAND_EXPIRED') return 'This errand expired before it could be cancelled. Refresh to see its current status.';
  if (error.code === 'ERRAND_INVALID_STATE') {
    const action = error.details.suggestedAction;
    if (action === 'OPEN_DISPUTE') return blocked.startedShort;
    if (action === 'COMPLETE_OR_DISPUTE') return blocked.finishedShort;
    return 'The errand changed status before cancellation could finish. Refresh to see the available actions.';
  }
  return error.message;
}
