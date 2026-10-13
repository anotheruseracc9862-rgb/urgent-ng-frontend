/**
 * Privacy-focused analytics with event allow-list
 * No free-text payloads, no PII
 */

// Allowed event names - only these can be tracked
const ALLOWED_EVENTS = [
  // Auth
  'auth.register_started',
  'auth.register_completed',
  'auth.login_started',
  'auth.login_completed',
  'auth.logout',
  
  // Errands
  'errand.create_started',
  'errand.create_completed',
  'errand.publish',
  'errand.cancel',
  
  // Offers
  'offer.create_started',
  'offer.create_completed',
  'offer.accept',
  'offer.reject',
  
  // Assignments
  'assignment.accept',
  'assignment.decline',
  'assignment.start',
  'assignment.complete',
  
  // Profile
  'profile.update',
  'profile.photo_upload',
  
  // Billing
  'billing.checkout_started',
  'billing.payment_completed',
  
  // Runner
  'runner.verification_started',
  'runner.verification_submitted',
] as const;

type AllowedEvent = typeof ALLOWED_EVENTS[number];

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

// Sensitive field patterns to check for
const SENSITIVE_PATTERNS = [
  /phone/i,
  /email/i,
  /address/i,
  /location/i,
  /message/i,
  /content/i,
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /name/i,
];

// Values are checked as well as keys: a harmless key can still carry a phone, an email or free text.
const SENSITIVE_VALUE_PATTERNS = [
  /\+?\d[\d\s-]{8,}\d/, // phone-like digit runs
  /[^\s@]+@[^\s@]+\.[^\s@]+/, // email
  /https?:\/\//i, // URLs can carry tokens and ids
];
const MAX_VALUE_LENGTH = 64; // enum-like values only, never free text

function containsSensitiveData(properties: EventProperties): boolean {
  return Object.entries(properties).some(
    ([key, value]) =>
      SENSITIVE_PATTERNS.some((pattern) => pattern.test(key)) ||
      (typeof value === 'string' &&
        (value.length > MAX_VALUE_LENGTH || SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value)))),
  );
}

function isAllowedEvent(event: string): event is AllowedEvent {
  return (ALLOWED_EVENTS as readonly string[]).includes(event);
}

export function track(event: string, properties?: EventProperties): void {
  // Check if event is in allow-list
  if (!isAllowedEvent(event)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Analytics: Event "${event}" is not in allow-list and was dropped`);
    }
    return;
  }

  // Check for sensitive data in properties
  if (properties && containsSensitiveData(properties)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Analytics: Event "${event}" contains sensitive data and was dropped`);
    }
    return;
  }

  // Only track in production
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to analytics service (e.g., PostHog)
    // window.analytics?.track(event, properties);
  } else {
    console.log('[Analytics]', event, properties);
  }
}

export function identify(userId: string, traits?: Record<string, string | number | boolean>): void {
  // Never send PII in traits
  const safeTraits = traits || {};
  
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to analytics service
    // window.analytics?.identify(userId, safeTraits);
  } else {
    console.log('[Analytics] Identify', userId, safeTraits);
  }
}

export function page(name: string, properties?: EventProperties): void {
  // Page views don't need to be in allow-list but still check for sensitive data
  if (properties && containsSensitiveData(properties)) {
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to analytics service
    // window.analytics?.page(name, properties);
  }
}
