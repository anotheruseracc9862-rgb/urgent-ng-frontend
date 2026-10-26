import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, '../../../../backend');
const output = path.resolve(here, '../features/console/generated-contracts.json');
const spec = JSON.parse(fs.readFileSync(path.join(backend, 'openapi.json'), 'utf8'));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = [...walk(path.join(backend, 'src/admin-api')), path.join(backend, 'src/admin/framework/approval.controller.ts'), path.join(backend, 'src/admin/framework/admin-reasons.ts'), path.join(backend, 'src/common/pagination/pagination.dto.ts'), path.join(backend, 'src/media/media.controller.ts')];
const decorators = node => (ts.getDecorators(node) ?? []).map(d => d.expression).filter(ts.isCallExpression);
const dec = (node, name) => decorators(node).find(d => d.expression.getText() === name);
const literal = node => {
  if (!node || !ts.isStringLiteral(node)) throw new Error(`Expected literal: ${node?.getText()}`);
  return node.text;
};
const routes = new Map();
const classes = new Map();
for (const file of files.filter(p => p.endsWith('.ts') && !p.endsWith('spec.ts'))) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  for (const cls of source.statements.filter(ts.isClassDeclaration)) {
    if (cls.name) classes.set(cls.name.text, cls);
    const controller = dec(cls, 'Controller');
    if (!controller) continue;
    const prefix = literal(controller.arguments[0]);
    for (const member of cls.members.filter(ts.isMethodDeclaration)) {
      const route = decorators(member).find(d => ['Get', 'Post', 'Put', 'Patch', 'Delete'].includes(d.expression.getText()));
      if (!route) continue;
      const url = ('/' + prefix + '/' + (route.arguments.length ? literal(route.arguments[0]) : '')).replace(/\/$/, '').replace(/:([\w]+)/g, '{$1}');
      if (!url.startsWith('/admin/') || url.startsWith('/admin/auth/') || url === '/admin/reason-codes') continue;
      const auth = dec(member, 'AdminAuth') ?? dec(cls, 'AdminAuth');
      if (!auth) throw new Error(`Unmapped protection: ${url}`);
      const method = route.expression.getText().toUpperCase();
      const key = `${method} ${url.slice(6)}`;
      if (routes.has(key)) throw new Error(`Duplicate ${key}`);
      routes.set(key, { method, path: url.slice(6), permissions: auth.arguments.map(literal), member });
    }
  }
}

// Swagger does not emit class-validator constraints. Preserve those from the DTOs
// too, including inherited properties and nested DTOs (resolved below).
function constraints(name, schema) {
  const cls = classes.get(name);
  if (!cls || !schema?.properties) return;
  for (const base of cls.heritageClauses ?? []) for (const type of base.types) constraints(type.expression.getText(), schema);
  for (const field of cls.members.filter(ts.isPropertyDeclaration)) {
    const target = schema.properties[field.name.getText()];
    if (!target) continue;
    for (const decorator of decorators(field)) {
      const name = decorator.expression.getText();
      const arg = decorator.arguments[0];
      const each = decorator.arguments.some(a => /each\s*:\s*true/.test(a.getText()));
      const value = each && target.items ? target.items : target;
      const numeric = { Min: 'minimum', Max: 'maximum', MinLength: 'minLength', MaxLength: 'maxLength', ArrayMinSize: 'minItems', ArrayMaxSize: 'maxItems' }[name];
      if (numeric && arg && ts.isNumericLiteral(arg)) value[numeric] = Number(arg.text);
      if (name === 'IsInt') value.type = 'integer';
      if (name === 'IsUUID') value.format = 'uuid';
      if (name === 'IsEmail') value.format = 'email';
    }
  }
}
for (const [name, schema] of Object.entries(spec.components.schemas)) constraints(name, schema);
// SetConfigDto.value is `unknown`; swagger's Object annotation is misleading.
// AdminConfigService.assertType accepts the selected key's number/boolean/string.
const configValue = spec.components.schemas.SetConfigDto?.properties?.value;
if (!configValue) throw new Error('SetConfigDto.value contract changed');
delete configValue.type;
configValue.oneOf = [{ type: 'number' }, { type: 'boolean' }, { type: 'string' }];

function resolve(schema, seen = [], isPropertyMap = false) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(s => resolve(s, seen));
  // Keys of a `properties` map are field names (a field may be called `title`), not schema keywords.
  if (isPropertyMap) return Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, resolve(v, seen)]));
  if (schema.$ref) {
    if (seen.includes(schema.$ref)) throw new Error(`Recursive schema cycle: ${schema.$ref}`);
    const target = schema.$ref.split('/').slice(1).reduce((o, k) => o?.[k], spec);
    if (!target) throw new Error(`Missing schema ${schema.$ref}`);
    const { $ref, ...rest } = schema;
    return { ...resolve(target, [...seen, $ref]), ...resolve(rest, seen) };
  }
  return Object.fromEntries(Object.entries(schema).filter(([k]) => !['example', 'examples', 'title', 'xml'].includes(k)).map(([k, v]) => [k, resolve(v, seen, k === 'properties')]));
}

const operations = new Map();
for (const [url, item] of Object.entries(spec.paths)) {
  if (!url.startsWith('/api/v1/admin/') || url.includes('/admin/auth/') || url.endsWith('/reason-codes')) continue;
  for (const [method, operation] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    const key = `${method.toUpperCase()} ${url.slice('/api/v1/admin'.length)}`;
    if (!routes.has(key)) throw new Error(`OpenAPI endpoint has no protected controller mapping: ${key}`);
    operations.set(key, operation);
  }
}

// AnyObjectDto has no properties. These display keys come from the corresponding
// admin-api services, not guessed counts or fields on the underlying tables.
const displayColumns = {
  '/audit/auth-events': ['id', 'createdAt', 'event', 'adminId', 'email', 'reason', 'ip', 'requestId'],
  '/orders': ['data.userName', 'data.type', 'data.status', 'data.amountMinor', 'data.reference', 'createdAt', 'id', 'data.paidAt'],
  '/payments': ['data.reference', 'data.status', 'data.amountMinor', 'data.orderId', 'createdAt', 'id', 'data.paidAt'],
  '/refunds': ['data.status', 'data.amountMinor', 'data.paymentId', 'data.reason', 'createdAt', 'data.failureReason', 'id', 'data.requestedById', 'data.approvedBy'],
  '/webhooks': ['data.eventType', 'data.status', 'data.signatureValid', 'data.reference', 'data.failureReason', 'createdAt', 'id', 'data.duplicateCount', 'data.processedAt'],
  '/subscriptions': ['data.userName', 'data.status', 'data.currentPeriodEnd', 'data.graceEndsAt', 'data.autoRenew', 'createdAt', 'id', 'data.userId'],
  '/boosts': ['data.errandTitle', 'data.status', 'data.activatesAt', 'data.expiresAt', 'data.endedReason', 'createdAt', 'id', 'data.errandId'],
  '/notifications/deliveries': ['data.type', 'data.channel', 'data.status', 'data.attempts', 'data.lastError', 'createdAt', 'id', 'data.notificationId', 'data.userId', 'data.suppressedReason'],
  '/ops/outbox': ['data.eventType', 'data.status', 'data.attempts', 'data.lastError', 'createdAt', 'data.aggregateType', 'id', 'data.aggregateId'],
  '/ops/data-requests': ['data.type', 'data.status', 'data.userId', 'data.dueAt', 'data.overdue', 'createdAt', 'id', 'data.summary', 'data.channel', 'data.assignedTo', 'data.resolution', 'data.resolvedAt'],
  '/config': ['key', 'group', 'value', 'default', 'type', 'overridden', 'version', 'needsSecondAdmin', 'upcoming'],
  '/config/{key}/history': ['version', 'value', 'effectiveFrom', 'updatedByAdminId', 'createdAt'],
  '/flags': ['key', 'enabled', 'default', 'upcoming'],
  '/pricing/products': ['id', 'code', 'name', 'type', 'currentPriceKobo', 'upcoming', 'versions'],
  '/pricing/products/{id}/versions': ['id', 'amountKobo', 'currency', 'effectiveFrom', 'notes', 'createdByAdminId'],
  '/notification-templates': ['key', 'category', 'emailsToo', 'title', 'body', 'active', 'overridden', 'placeholders'],
  '/policies': ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'SAFETY_POLICY', 'PROHIBITED_ITEMS_POLICY', 'OFFLINE_PAYMENT_TERMS', 'LOCATION_SHARING', 'MARKETING_COMMUNICATIONS'],
  '/reference/reasons': ['cancellationReasons', 'reportTypes', 'disputeTypes'],
  '/no-shows': ['id', 'createdAt', 'assignmentId', 'errandId', 'reporterId', 'accusedId', 'status', 'note', 'responseDueAt', 'respondedAt'],
  '/ratings': ['id', 'createdAt', 'assignmentId', 'direction', 'status', 'revealed', 'review', 'overall', 'rater', 'ratee'],
  '/roles': ['id', 'name', 'description', 'permissions', 'admins'],
  '/ops/queues': ['name', 'counts'],
  '/ops/risk-flags': ['id', 'userId', 'errandId', 'signal', 'status', 'occurrences', 'lastSeenAt', 'details', 'reviewedBy', 'reviewedAt', 'reviewNote', 'createdAt'],
  '/offer-limits/{userId}': ['used', 'limit', 'remaining', 'resetsAt', 'isPro', 'isAtLimit'],
  '/ops/sweepers': ['name', 'lastStartedAt', 'lastFinishedAt', 'lastDurationMs', 'lastProcessed', 'lastError', 'lastErrorAt', 'runs', 'failures', 'stale'],
  '/analytics/overview': ['windowDays', 'errandsPublished', 'errandsWithOffer', 'shareReceivingOffer', 'minutesToFirstOfferMedian', 'minutesToFirstOfferP90', 'errandsCompleted', 'completionRate', 'averageRating', 'ratingsCount', 'repeatRequesterShare', 'requestersWithCompleted'],
  '/analytics/funnel': ['windowDays', 'all', 'runners', 'requesters'],
  '/analytics/revenue': ['windowDays', 'totalGrossMinor', 'totalNetMinor', 'streams', 'daily'],
  '/analytics/supply-demand': ['area', 'errands', 'errandsWithOffer', 'errandsCompleted', 'offers', 'availableRunnersWithin5km', 'errandsPerRunner'],
  '/errands/{id}/timeline': ['at', 'source', 'type', 'actorType', 'actorId', 'detail'],
  '/errands/{id}/locations': ['type', 'addressText', 'landmark', 'area', 'lat', 'lng'],
  '/errands/{id}/offers': ['id', 'runner', 'amountMinor', 'durationMinutes', 'status', 'closeReason', 'awaitingParty', 'needsReconfirmation', 'createdAt'],
  '/offers/{id}': ['id', 'errand', 'runner', 'amountMinor', 'durationMinutes', 'status', 'closeReason', 'version', 'createdAt', 'history'],
};

const endpoints = [...routes.entries()].map(([key, route]) => {
  const operation = operations.get(key);
  if (!operation) throw new Error(`OpenAPI is missing ${key}; regenerate backend OpenAPI first.`);
  const query = (operation.parameters ?? []).map(p => resolve(p)).filter(p => p.in === 'query').map(p => ({ name: p.name, required: p.required === true, schema: p.schema ?? {} }));
  const queryParam = route.member.parameters.find(p => dec(p, 'Query') && dec(p, 'Query').arguments.length === 0);
  if (queryParam?.type) constraints(queryParam.type.getText(), { properties: Object.fromEntries(query.map(f => [f.name, f.schema])) });
  const body = resolve(operation?.requestBody?.content?.['application/json']?.schema ?? null);
  const sourceHasBody = route.member.parameters.some(p => dec(p, 'Body'));
  if (sourceHasBody !== !!body) throw new Error(`Body mismatch: ${key}`);
  const response = resolve(Object.values(operation?.responses ?? {}).find(r => r.content?.['application/json'])?.content['application/json'].schema ?? {});
  let data = response.properties?.data ?? response;
  if (data.type === 'array') data = data.items;
  const columns = route.method === 'GET' && displayColumns[route.path] || Object.keys(data?.properties ?? {});
  return { method: route.method, path: route.path, permissions: route.permissions, ...(operation?.summary ? { summary: operation.summary } : {}), query, body, hasBody: sourceHasBody, ...(columns.length ? { responseColumns: columns } : {}) };
}).sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
const json = '[\n' + endpoints.map(e => JSON.stringify(e)).join(',\n') + '\n]\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(output, 'utf8') !== json) throw new Error('Admin contracts are stale. Run node apps/admin/scripts/generate-admin-contracts.mjs');
} else {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, json);
}
console.log(`${endpoints.length} protected admin contracts validated.`);
