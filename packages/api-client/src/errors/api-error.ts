export interface ApiErrorData {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: ApiErrorData,
    public headers: Headers
  ) {
    super(data.message || `API Error: ${status}`);
    this.name = 'ApiError';
  }

  get isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
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
    return this.data.errors || {};
  }

  getFieldError(field: string): string | undefined {
    const errors = this.getFieldErrors();
    return errors[field]?.[0];
  }
}
