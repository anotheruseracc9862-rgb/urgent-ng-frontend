// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resources } from './catalog';
import { endpoint, endpoints } from './contracts';

describe('admin console contracts', () => {
  it('regenerates exactly from backend OpenAPI and actual AdminAuth decorators', () => {
    const script = fileURLToPath(new URL('../../scripts/generate-admin-contracts.mjs', import.meta.url));
    expect(execFileSync(process.execPath, [script, '--check'], { encoding: 'utf8' })).toContain('protected admin contracts validated');
  });

  it('makes every non-auth admin operation reachable from curated workspaces', () => {
    const reachable = new Set<string>();
    expect(new Set(resources.map(r => r.slug)).size).toBe(resources.length);
    for (const resource of resources) {
      const references = [
        ...[resource.list, resource.detail, resource.lookup].filter((p): p is string => !!p).map(path => ({ method: 'GET', path })),
        ...(resource.related ?? []).map(r => ({ method: 'GET', path: r.path })),
        ...(resource.exports ?? []).map(r => ({ method: 'GET', path: r.path })),
        ...(resource.actions ?? []),
      ];
      for (const ref of references) {
        expect(endpoint(ref.method, ref.path), resource.slug).toBeDefined();
        reachable.add(`${ref.method} ${ref.path}`);
      }
      if (resource.list) expect(resource.permission).toBe(endpoint('GET', resource.list).permissions[0]);
    }
    expect(endpoints.filter(e => !reachable.has(`${e.method} ${e.path}`)).map(e => `${e.method} ${e.path}`)).toEqual([]);
    expect(endpoints.some(e => e.path.startsWith('/auth/') || e.path === '/reason-codes')).toBe(false);
    expect(() => endpoint('GET', '/invented')).toThrow('Unknown admin endpoint');
  });

  it('retains all-required permissions, including separate sensitive and export gates', () => {
    expect(endpoint('GET', '/errands/{id}/locations').permissions).toEqual(['ERRANDS_VIEW', 'LOCATION_EXACT_VIEW']);
    expect(endpoint('GET', '/disputes/{id}/chat').permissions).toEqual(['DISPUTES_VIEW', 'CHAT_SENSITIVE_VIEW']);
    expect(endpoint('GET', '/verifications/{attemptId}/submission').permissions).toEqual(['VERIFICATION_VIEW', 'SENSITIVE_DATA_VIEW']);
    expect(endpoint('GET', '/audit/export.csv').permissions).toEqual(['AUDIT_VIEW', 'AUDIT_EXPORT']);
    expect(endpoint('GET', '/analytics/export.csv').permissions).toEqual(['ANALYTICS_VIEW', 'ANALYTICS_EXPORT']);
    for (const resource of resources) for (const related of resource.related ?? []) {
      if (endpoint('GET', related.path).permissions.some(p => ['LOCATION_EXACT_VIEW', 'CHAT_SENSITIVE_VIEW', 'SENSITIVE_DATA_VIEW'].includes(p))) expect(related.sensitive).toBe(true);
    }
  });

  it('preserves nested forms, constraints and scalar configuration values without refs', () => {
    expect(JSON.stringify(endpoints)).not.toContain('"$ref"');
    const enforcement = endpoint('POST', '/enforcement').body!;
    expect(enforcement.required).toContain('reasonCode');
    expect(enforcement.properties?.content.properties?.type.enum).toContain('MESSAGE');
    const dispute = endpoint('POST', '/disputes/{id}/resolve').body!;
    expect(dispute.properties?.facts.items?.required).toEqual(['userId', 'type']);
    expect(endpoint('POST', '/notifications/announcements').body?.properties?.message.minLength).toBe(5);
    expect(endpoint('POST', '/notifications/announcements').body?.properties?.userIds.maxItems).toBe(500);
    expect(endpoint('PUT', '/config/{key}').body?.properties?.value.oneOf).toEqual([{ type: 'number' }, { type: 'boolean' }, { type: 'string' }]);
    expect(endpoint('GET', '/audit/auth-events').query.map(f => f.name).sort()).toEqual(['adminId', 'cursor', 'limit']);
  });

  it('does not invent reason bodies for notes, decisions, cancel or sensitive reads', () => {
    expect(endpoint('POST', '/disputes/{id}/notes').body?.required).toEqual(['body']);
    expect(endpoint('POST', '/reports/{id}/notes').body?.properties).not.toHaveProperty('reasonCode');
    expect(endpoint('POST', '/approvals/{id}/approve').body?.properties).toEqual({ note: { type: 'string', maxLength: 500, description: 'A note shown with the decision.' } });
    expect(endpoint('POST', '/approvals/{id}/cancel')).toMatchObject({ hasBody: false, body: null, permissions: [] });
    for (const e of endpoints.filter(e => e.method === 'GET')) expect(e).toMatchObject({ hasBody: false, body: null });
    expect(resources.find(r => r.slug === 'approvals')?.actions?.map(a => a.approvalDecision)).toEqual(['approve', 'reject', 'cancel']);
  });
});
