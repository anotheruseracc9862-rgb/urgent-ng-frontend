import { endpoint } from './contracts';

export interface Resource {
  slug: string;
  title: string;
  description: string;
  group: string;
  permission?: string;
  list?: string;
  lookup?: string;
  detail?: string;
  idKey?: string;
  columns: string[];
  /** Sensitive reads are explicit, separately authorized and never prefetched. */
  related?: { label: string; path: string; sensitive?: boolean }[];
  actions?: { label: string; method: string; path: string; scope: 'record' | 'collection'; when?: { field: string; values: unknown[] }; approvalDecision?: 'approve' | 'reject' | 'cancel' }[];
  exports?: { label: string; path: string; query?: Record<string, string> }[];
}

const action = (label: string, path: string, method = 'POST', scope: 'record' | 'collection' = 'record'): NonNullable<Resource['actions']>[number] => ({ label, path, method, scope });
const related = (label: string, path: string, sensitive = false) => ({ label, path, ...(sensitive ? { sensitive } : {}) });
function resource(slug: string, title: string, group: string, list: string | undefined, options: Partial<Resource> = {}): Resource {
  const permission = list ? endpoint('GET', list).permissions[0] : undefined;
  return { slug, title, group, description: title + ' workspace. Results and pagination come from the server.', columns: list ? endpoint('GET', list).responseColumns ?? [] : [], ...(list ? { list } : {}), ...(permission ? { permission } : {}), ...options };
}

/** Curated workspaces, never an endpoint explorer. All permissions come from contracts. */
export const resources: Resource[] = [
  resource('users', 'Users', 'Trust', '/users', {
    detail: '/users/{id}',
    related: [related('Contact', '/users/{id}/contact', true), related('Consents', '/users/{id}/consents'), related('Enforcement', '/users/{id}/enforcement'), related('Ladder', '/users/{id}/ladder'), related('Verifications', '/users/{id}/verifications'), related('Badges', '/users/{id}/badges'), related('Pro subscription', '/users/{id}/pro'), related('Entitlements', '/users/{id}/entitlements')],
    actions: [action('Deactivate', '/users/{id}/deactivate'), action('Reactivate', '/users/{id}/reactivate'), action('Revoke sessions', '/users/{id}/revoke-sessions'), action('Suspend', '/users/{id}/suspend'), action('Grant verification attempts', '/users/{id}/verification/grant-attempts'), action('Revoke verification', '/users/{id}/verification/revoke'), action('Recompute badges', '/users/{id}/badges/recompute'), action('Grant Pro', '/users/{id}/pro/grant'), action('End Pro', '/users/{id}/pro/end'), action('Grant entitlement', '/users/{id}/entitlements')],
  }),
  resource('verifications', 'Verification queue', 'Trust', '/verifications', { idKey: 'id', related: [related('Submission', '/verifications/{attemptId}/submission', true)], actions: [action('Approve', '/verifications/{attemptId}/approve'), action('Reject', '/verifications/{attemptId}/reject')] }),
  resource('enforcement', 'Enforcement', 'Trust', '/enforcement', { actions: [action('Apply enforcement', '/enforcement', 'POST', 'collection'), action('Revoke', '/enforcement/{id}/revoke'), action('Decide appeal', '/enforcement/{id}/appeal/decide')] }),
  resource('appeals', 'Appeals', 'Trust', '/enforcement/appeals', { actions: [action('Decide appeal', '/enforcement/{id}/appeal/decide')] }),
  resource('enforcement-reviews', 'Enforcement reviews', 'Trust', '/enforcement/reviews', { actions: [action('Dismiss', '/enforcement/reviews/{id}/dismiss')] }),
  resource('blocklist', 'Blocklist', 'Trust', '/blocklist', { actions: [action('Block', '/blocklist', 'POST', 'collection'), action('Unblock', '/blocklist/{id}', 'DELETE')] }),
  resource('errands', 'Errands', 'Marketplace', '/errands', { detail: '/errands/{id}', related: [related('Timeline', '/errands/{id}/timeline'), related('Offers', '/errands/{id}/offers'), related('Exact locations', '/errands/{id}/locations', true)], actions: ['cancel', 'expire', 'reopen', 'transition', 'extend', 'legal-hold', 'remove-content'].map(name => action(name.replaceAll('-', ' '), `/errands/{id}/${name}`)) }),
  resource('offers', 'Offer lookup', 'Marketplace', undefined, { lookup: '/offers/{id}', actions: [action('Close offer', '/offers/{id}/close')] }),
  resource('assignments', 'Assignments', 'Marketplace', '/assignments', { detail: '/assignments/{id}', actions: [action('Cancel', '/assignments/{id}/cancel'), action('Release', '/assignments/{id}/release')] }),
  resource('disputes', 'Disputes', 'Cases', '/disputes', { detail: '/disputes/{id}', related: [related('Case chat', '/disputes/{id}/chat', true)], actions: ['start-review', 'assign', 'escalate', 'notes', 'resolve'].map(name => action(name.replaceAll('-', ' '), `/disputes/{id}/${name}`)) }),
  resource('reports', 'Reports', 'Cases', '/reports', { detail: '/reports/{id}', actions: ['status', 'link-dispute', 'assign', 'escalate', 'notes', 'resolve'].map(name => action(name.replaceAll('-', ' '), `/reports/{id}/${name}`)) }),
  resource('no-shows', 'No-shows', 'Cases', '/no-shows', { actions: [action('Resolve', '/no-shows/{id}/resolve')] }),
  resource('ratings', 'Ratings', 'Cases', '/ratings', { actions: [action('Moderate', '/ratings/{id}/moderate')] }),
  resource('conversations', 'Conversation lookup', 'Cases', undefined, { description: 'Enter a conversation ID to explicitly load audited messages. CHAT_SENSITIVE_VIEW is required.', related: [related('Messages', '/conversations/{id}/messages', true)] }),
  resource('messages', 'Message moderation', 'Cases', undefined, { description: 'Enter the message ID from an authorized case review. No message content is prefetched.', actions: [action('Remove message', '/messages/{id}/remove', 'POST', 'collection')] }),
  resource('media', 'Sensitive media lookup', 'Trust', undefined, { description: 'Explicit audited media access. The backend additionally checks the permission for the media purpose.', related: [related('Signed media URL', '/media/{id}/url', true)] }),
  resource('orders', 'Orders', 'Billing', '/orders', { detail: '/orders/{id}' }),
  resource('payments', 'Payments', 'Billing', '/payments', { actions: [action('Request refund', '/payments/{id}/refund')] }),
  resource('refunds', 'Refunds', 'Billing', '/refunds', { actions: [action('Approve', '/refunds/{id}/approve'), action('Reject', '/refunds/{id}/reject')] }),
  resource('webhooks', 'Payment webhooks', 'Billing', '/webhooks', { actions: [action('Replay', '/webhooks/{id}/replay'), action('Reconcile billing', '/billing/reconcile', 'POST', 'collection')] }),
  resource('subscriptions', 'Subscriptions', 'Billing', '/subscriptions'),
  resource('boosts', 'Boosts', 'Billing', '/boosts', { actions: [action('End', '/boosts/{id}/end'), action('Extend', '/boosts/{id}/extend')] }),
  resource('offer-limits', 'Offer limit lookup', 'Billing', undefined, { lookup: '/offer-limits/{userId}', actions: [action('Reset', '/offer-limits/{userId}/reset')] }),
  resource('entitlements', 'Entitlement revocation', 'Billing', undefined, { description: 'Find entitlements in the user workspace, then enter the entitlement ID to revoke.', actions: [action('Revoke entitlement', '/entitlements/{id}/revoke', 'POST', 'collection')] }),
  resource('pricing', 'Pricing products', 'Configuration', '/pricing/products', { related: [related('Price versions', '/pricing/products/{id}/versions')], actions: [action('Set future price', '/pricing/products/{id}/prices')] }),
  resource('config', 'Configuration', 'Configuration', '/config', { idKey: 'key', related: [related('History', '/config/{key}/history')], actions: [action('Set value', '/config/{key}', 'PUT')] }),
  resource('flags', 'Feature flags', 'Configuration', '/flags', { idKey: 'key', actions: [action('Set flag', '/flags/{key}', 'PUT')] }),
  resource('categories', 'Categories', 'Configuration', '/categories', { actions: [action('Create', '/categories', 'POST', 'collection'), action('Update', '/categories/{id}', 'PATCH')] }),
  resource('prohibited', 'Prohibited items', 'Configuration', '/prohibited-items', { actions: [action('Create', '/prohibited-items', 'POST', 'collection'), action('Update', '/prohibited-items/{id}', 'PATCH')] }),
  resource('policies', 'Policies', 'Configuration', '/policies', { actions: [action('Publish version', '/policies', 'POST', 'collection')] }),
  resource('templates', 'Notification templates', 'Configuration', '/notification-templates', { idKey: 'key', actions: [action('Set template', '/notification-templates/{key}', 'PUT'), action('Reset template', '/notification-templates/{key}', 'DELETE')] }),
  resource('reference-reasons', 'Platform reason reference', 'Configuration', '/reference/reasons', { columns: ['cancellationReasons', 'reportTypes', 'disputeTypes'] }),
  resource('deliveries', 'Notification deliveries', 'Operations', '/notifications/deliveries', { idKey: 'data.notificationId', actions: [action('Resend notification', '/notifications/{id}/resend'), action('Send service announcement', '/notifications/announcements', 'POST', 'collection')] }),
  resource('outbox', 'Outbox', 'Operations', '/ops/outbox', { related: [related('Summary', '/ops/outbox/summary')], actions: [{ ...action('Retry dead letter', '/ops/outbox/{id}/retry'), when: { field: 'data.status', values: ['DEAD_LETTERED'] } }] }),
  resource('queues', 'Queues', 'Operations', '/ops/queues', { idKey: 'name', columns: ['name', 'counts'] }),
  resource('sweepers', 'Sweepers', 'Operations', '/ops/sweepers', { idKey: 'name', columns: ['name', 'stale', 'lastFinishedAt', 'lastProcessed', 'failures', 'lastError', 'runs', 'lastDurationMs'] }),
  resource('risk-flags', 'Risk flags', 'Operations', '/ops/risk-flags', { actions: [action('Review', '/ops/risk-flags/{id}/review')] }),
  resource('data-requests', 'Data subject requests', 'Operations', '/ops/data-requests', { actions: [action('Create', '/ops/data-requests', 'POST', 'collection'), action('Update', '/ops/data-requests/{id}')] }),
  resource('audit', 'Audit log', 'Audit & analytics', '/audit', { exports: [{ label: 'Export audit CSV', path: '/audit/export.csv' }] }),
  resource('auth-events', 'Admin authentication events', 'Audit & analytics', '/audit/auth-events', { columns: ['id', 'createdAt', 'event', 'adminId', 'email', 'reason', 'ip', 'requestId'] }),
  ...(['overview', 'funnel', 'revenue', 'supply-demand'] as const).map(report => resource(`analytics-${report}`, `Analytics: ${report}`, 'Audit & analytics', `/analytics/${report}`, { exports: [{ label: 'Export CSV', path: '/analytics/export.csv', query: { report } }] })),
  resource('admins', 'Administrators', 'Access', '/admins', { detail: '/admins/{id}', actions: [action('Invite', '/admins/invite', 'POST', 'collection'), action('Set roles', '/admins/{id}/roles', 'PUT'), ...['reset-mfa', 'revoke-sessions', 'deactivate', 'reactivate'].map(name => action(name.replaceAll('-', ' '), `/admins/{id}/${name}`))] }),
  resource('roles', 'Roles', 'Access', '/roles', { actions: [action('Create role', '/roles', 'POST', 'collection'), action('Set permissions', '/roles/{id}/permissions', 'PUT')] }),
  resource('approvals', 'Four-eyes approvals', 'Access', '/approvals', { detail: '/approvals/{id}', description: 'Approve/reject only when backend canDecide is true. Cancel only when requestedBy is the current admin and status is PENDING.', actions: (['approve', 'reject', 'cancel'] as const).map(decision => ({ ...action(decision, `/approvals/{id}/${decision}`), approvalDecision: decision })) }),
];
