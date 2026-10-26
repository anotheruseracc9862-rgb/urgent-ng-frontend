import { isApiError } from '@/lib/api/client';

/** Plain-language text for a billing error. Raw backend messages are never shown. */
export function billingErrorMessage(error: unknown): string {
  if (!isApiError(error)) return 'Something went wrong. Please try again.';
  switch (error.code) {
    case 'FEATURE_DISABLED':
      return 'Purchases are paused for now. Please check back later.';
    case 'PAYMENT_PROVIDER_UNAVAILABLE':
      return 'The payment service is not responding. Try again in a moment.';
    case 'SUBSCRIPTION_NOT_ACTIVE':
      return 'This needs an active Runner Pro plan.';
    case 'BOOST_NOT_ELIGIBLE':
      return boostReasonMessage(error.details.reason);
    default:
      return error.status === 409
        ? 'This purchase is not available right now. Refresh and try again.'
        : 'We could not complete that. Please try again.';
  }
}

export function boostReasonMessage(reason: unknown): string {
  switch (reason) {
    case 'ALREADY_BOOSTED':
      return 'This errand is already boosted.';
    case 'NOT_OPEN':
    case 'ERRAND_NOT_OPEN':
      return 'Only an open errand without a selected runner can be boosted.';
    case 'TIME_ELAPSED':
      return 'This errand has run out of time and can no longer be boosted.';
    default:
      return 'This errand cannot be boosted.';
  }
}
