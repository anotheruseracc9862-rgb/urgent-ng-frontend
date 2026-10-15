'use client';

import { Alert, Button } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';

export const casePanel = 'grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-6';
export const caseInput = 'min-h-11 min-w-0 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal text-ink';
export const caseLabel = 'grid gap-2 text-sm font-bold text-ink';
export const caseDate = (value: string) => `${formatDate(value)} (Lagos time)`;
export const caseLabelText = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

export function CaseError({ error, retry }: { error: unknown; retry?: () => void }) {
  const known = isApiError(error);
  const message = known && error.status === 404 ? 'This case or assignment could not be found, or is not available to you.'
    : known && error.status === 403 ? 'You do not have permission to perform this action.'
    : known && error.code === 'VALIDATION_ERROR' ? 'Check the evidence and required fields. References must belong to this errand and be available to you.'
    : known && error.code === 'MEDIA_INVALID' ? 'This photo is unavailable or already attached. Upload a new evidence photo.'
    : known && error.details.reason === 'DISPUTE_CLOSED' ? 'This dispute is closed. Evidence can no longer be added.'
    : known && ['ERRAND_INVALID_STATE', 'ASSIGNMENT_INVALID_STATE'].includes(error.code) ? 'The errand status changed. Refresh to check the available actions.'
    : known && error.code === 'DISPUTE_ALREADY_OPEN' ? 'A dispute is already open for this assignment.'
    : known && error.status === 429 ? 'The request limit has been reached. Please wait before trying again.'
    : 'We could not complete this request. Please try again.';
  return <Alert variant="danger" role="alert"><p>{message}</p>
    {known && typeof error.details.field === 'string' ? <p className="mt-1 text-xs">Check: {error.details.field}</p> : null}
    {known && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
    {retry ? <Button type="button" size="sm" variant="ghost" onClick={retry}>Try again</Button> : null}
  </Alert>;
}
