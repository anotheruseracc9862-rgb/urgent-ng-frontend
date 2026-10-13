export type ApiErrorCategory =
  | "validation"
  | "auth"
  | "permission"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "state"
  | "server"
  | "network";

const CATEGORY_BY_CODE: Readonly<Record<string, ApiErrorCategory>> = {
  ACCOUNT_DEACTIVATED: "state",
  ACCOUNT_DELETION_PENDING: "state",
  ACCOUNT_LOCKED: "auth",
  ACCOUNT_SUSPENDED: "state",
  ASSIGNMENT_INVALID_STATE: "state",
  AUTHORIZATION_ERROR: "permission",
  AUTH_REQUIRED: "auth",
  AUTHENTICATION_ERROR: "auth",
  CONFLICT: "conflict",
  ERRAND_INVALID_STATE: "state",
  FORBIDDEN: "permission",
  IDEMPOTENCY_CONFLICT: "conflict",
  IDENTITY_REQUIRED: "auth",
  IDENTIFIER_TAKEN: "conflict",
  INTERNAL_ERROR: "server",
  INVALID_CREDENTIALS: "auth",
  MFA_ENROLMENT_REQUIRED: "auth",
  MFA_INVALID: "auth",
  MFA_REQUIRED: "auth",
  NOT_FOUND: "not_found",
  OTP_EXPIRED: "auth",
  OTP_INVALID: "auth",
  OTP_RATE_LIMITED: "rate_limited",
  PERMISSION_DENIED: "permission",
  POLICY_ACCEPTANCE_REQUIRED: "state",
  RATE_LIMITED: "rate_limited",
  RESOURCE_CONFLICT: "conflict",
  RESOURCE_NOT_FOUND: "not_found",
  SERVER_ERROR: "server",
  USER_BLOCKED: "permission",
  VALIDATION_ERROR: "validation",
};

function categoryFor(code: string, status: number): ApiErrorCategory {
  const mapped = CATEGORY_BY_CODE[code];
  if (mapped) return mapped;
  if (status === 401) return "auth";
  if (status === 403) return "permission";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  if (status === 0) return "network";
  return "state";
}

function parseRetryAfter(headers?: Headers): number | undefined {
  const value = headers?.get("Retry-After");
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export class ApiError extends Error {
  readonly category: ApiErrorCategory;
  readonly details: Record<string, unknown>;

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    details?: unknown,
    readonly requestId?: string,
    readonly headers?: Headers,
  ) {
    super(message);
    this.name = "ApiError";
    this.category = categoryFor(code, status);
    this.details =
      details && typeof details === "object" && !Array.isArray(details)
        ? (details as Record<string, unknown>)
        : {};
  }

  get retryAfterSeconds(): number | undefined {
    const value = this.details.retryAfterSeconds;
    return typeof value === "number" ? value : parseRetryAfter(this.headers);
  }

  get fieldMessages(): string[] {
    const fields = this.details.fields;
    return Array.isArray(fields) ? fields.filter((field): field is string => typeof field === "string") : [];
  }

  get isValidationError(): boolean {
    return this.category === "validation";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  getFieldErrors(): Record<string, string[]> {
    const errors = this.details.fields;
    return errors && typeof errors === "object" && !Array.isArray(errors)
      ? (errors as Record<string, string[]>)
      : {};
  }

  getFieldError(field: string): string | undefined {
    return this.getFieldErrors()[field]?.[0];
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
