import { describe, expect, it } from 'vitest';
import { createOpenApiHandlers, exampleFor, loadSpec } from './openapi-handlers';

describe('OpenAPI handlers', () => {
  const spec = loadSpec();

  it('creates one handler per operation in the contract', () => {
    const operations = Object.values(spec.paths).reduce(
      (count, item) => count + ['get', 'post', 'put', 'patch', 'delete'].filter((m) => m in item).length,
      0,
    );
    expect(operations).toBeGreaterThan(300);
    expect(createOpenApiHandlers(spec)).toHaveLength(operations);
  });

  it('builds examples from $ref, enum and nested object schemas', () => {
    const media = exampleFor(spec, { $ref: '#/components/schemas/MediaDto' }) as Record<string, unknown>;
    expect(media).toHaveProperty('id');
    expect(media).toHaveProperty('status');
  });
});
