import { setupServer } from 'msw/node';
import { createOpenApiHandlers } from './openapi-handlers';

export const server = setupServer(...createOpenApiHandlers());

/**
 * Starts the server for a test file. The API client sends same-origin relative URLs
 * (`/api/v1/...`), which a browser resolves and Node's `fetch` rejects, so a wrapper outside MSW
 * resolves them against the jsdom origin and drops jsdom's `signal` (it is not an instance of the
 * AbortSignal Node's fetch expects). Call it in `beforeAll` and `server.close()` in `afterAll`.
 */
export function listen(): void {
  server.listen({ onUnhandledRequest: 'error' });

  const interceptedFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const resolved =
      typeof input === 'string' && input.startsWith('/') ? new URL(input, window.location.origin).toString() : input;
    const rest: RequestInit = { ...init };
    delete rest.signal;
    return interceptedFetch(resolved, rest);
  }) as typeof fetch;
}

export { apiError } from './openapi-handlers';
