import generated from './generated-contracts.json';

/** Resolved OpenAPI schema. Empty schemas intentionally allow dynamic JSON values. */
export interface Schema {
  type?: string | string[];
  enum?: unknown[];
  description?: string;
  format?: string;
  nullable?: boolean;
  required?: string[];
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  default?: unknown;
  items?: Schema;
  properties?: Record<string, Schema>;
  additionalProperties?: boolean | Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  [keyword: string]: unknown;
}

export interface Field { name: string; required: boolean; schema: Schema }
export interface Endpoint {
  method: string;
  /** Relative to /admin, not the deployment's /api/v1 prefix. */
  path: string;
  /** ALL permissions are required; [] means any authenticated admin. */
  permissions: string[];
  summary?: string;
  query: Field[];
  body: Schema | null;
  hasBody: boolean;
  responseColumns?: string[];
}

export const endpoints: Endpoint[] = generated as Endpoint[];
export function endpoint(method: string, path: string): Endpoint {
  const found = endpoints.find(e => e.method === method.toUpperCase() && e.path === path);
  if (!found) throw new Error(`Unknown admin endpoint: ${method} ${path}`);
  return found;
}
