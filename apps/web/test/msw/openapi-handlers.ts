import { readFileSync } from 'node:fs';
import path from 'node:path';
import { http, HttpResponse, type HttpHandler } from 'msw';

/**
 * MSW handlers generated from the backend contract (`backend/openapi.json`, frozen by
 * `npm run contract:check` in `backend/`). Every operation in the spec gets a handler that answers
 * with an example built from its first 2xx response schema, wrapped in the `{ data, meta, requestId }`
 * envelope. A test overrides the operations it cares about with `server.use(...)`.
 *
 * Routes the spec does not describe are not mocked, so MSW reports them as unhandled requests.
 */

type Json = Record<string, unknown>;

interface Schema {
  $ref?: string;
  type?: string | string[];
  enum?: unknown[];
  example?: unknown;
  default?: unknown;
  nullable?: boolean;
  format?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  additionalProperties?: boolean | Schema;
}

interface Operation {
  responses?: Record<string, { content?: Record<string, { schema?: Schema; example?: unknown }> }>;
}

interface Spec {
  paths: Record<string, Record<string, Operation>>;
  components?: { schemas?: Record<string, Schema> };
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export const OPENAPI_PATH = path.resolve(__dirname, '../../../../../backend/openapi.json');

export function loadSpec(file = OPENAPI_PATH): Spec {
  return JSON.parse(readFileSync(file, 'utf8')) as Spec;
}

function resolveRef(spec: Spec, ref: string): Schema {
  const name = ref.replace('#/components/schemas/', '');
  return spec.components?.schemas?.[name] ?? {};
}

/** Builds one plausible value for a schema. Depth is capped so recursive schemas terminate. */
export function exampleFor(spec: Spec, schema: Schema | undefined, depth = 0): unknown {
  if (!schema || depth > 6) return null;
  if (schema.$ref) return exampleFor(spec, resolveRef(spec, schema.$ref), depth + 1);
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];

  const composed = schema.allOf ?? schema.oneOf ?? schema.anyOf;
  if (composed) {
    if (schema.allOf) {
      return composed.reduce<Json>(
        (merged, part) => ({ ...merged, ...(exampleFor(spec, part, depth + 1) as Json | null) }),
        {},
      );
    }
    return exampleFor(spec, composed[0], depth + 1);
  }

  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
  switch (type) {
    case 'string':
      if (schema.format === 'date-time') return '2026-01-01T00:00:00.000Z';
      if (schema.format === 'date') return '2026-01-01';
      if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
      return 'example';
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
    default: {
      if (!schema.properties) return {};
      return Object.fromEntries(
        Object.entries(schema.properties).map(([key, value]) => [key, exampleFor(spec, value, depth + 1)]),
      );
    }
  }
}

function toMswPath(specPath: string): string {
  return `*${specPath.replace(/\{([^}]+)\}/g, ':$1')}`;
}

export function createOpenApiHandlers(spec: Spec = loadSpec()): HttpHandler[] {
  const handlers: HttpHandler[] = [];

  for (const [specPath, operations] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      const operation = operations[method];
      if (!operation) continue;

      const [status, response] =
        Object.entries(operation.responses ?? {}).find(([code]) => code.startsWith('2')) ?? ['200', undefined];
      const json = response?.content?.['application/json'];
      const code = Number(status);

      handlers.push(
        http[method](toMswPath(specPath), () => {
          if (code === 204 || !json) return new HttpResponse(null, { status: code });
          const data = json.example ?? exampleFor(spec, json.schema);
          return HttpResponse.json({ data, meta: {}, requestId: 'req-msw' }, { status: code });
        }),
      );
    }
  }

  return handlers;
}

/** The error envelope the backend sends, for overriding a handler with a failure. */
export function apiError(status: number, code: string, message: string, details?: unknown) {
  return HttpResponse.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) }, requestId: 'req-msw' },
    { status },
  );
}
