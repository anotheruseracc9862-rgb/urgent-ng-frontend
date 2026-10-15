/**
 * Safe client error reporting (Frontend PRD §49, §50). Messages and stacks are scrubbed of phone
 * numbers, emails and long ids before they reach the console or a monitoring service, and the
 * scope says which boundary caught the error.
 */

export type ErrorScope = 'route' | 'component' | 'query' | 'realtime';

export function scrub(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text
    .replace(/\/shared\/[^\s/?#)]+/g, '/shared/[TOKEN]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]')
    .replace(/\b\d{13,}\b/g, '[ID]')
    .replace(/\+?\d[\d\s-]{8,}\d/g, '[PHONE]');
}

export interface SafeErrorReport {
  scope: ErrorScope;
  name: string;
  message: string;
  stack?: string;
  digest?: string;
}

export function toSafeReport(
  error: unknown,
  scope: ErrorScope,
  extra: { componentStack?: string | null } = {},
): SafeErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  const digest = (err as Error & { digest?: string }).digest;
  return {
    scope,
    name: err.name,
    message: scrub(err.message) ?? '',
    stack: scrub([err.stack, extra.componentStack].filter(Boolean).join('\n')),
    ...(digest ? { digest } : {}),
  };
}

export function reportError(error: unknown, scope: ErrorScope, extra?: { componentStack?: string | null }): SafeErrorReport {
  const report = toSafeReport(error, scope, extra);
  if (process.env.NODE_ENV === 'production') {
    // Hand `report` to the monitoring client here (Sentry); it never receives the raw error.
  } else {
    console.error(`[Error:${scope}]`, report.name, report.message);
  }
  return report;
}
