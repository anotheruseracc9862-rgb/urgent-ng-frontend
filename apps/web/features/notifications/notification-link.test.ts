import { describe, expect, it } from 'vitest';
import type { components } from '@urgent/api-client';
import { notificationHref } from './notification-link';

const make = (type: string, data: Record<string, unknown> = {}) =>
  ({ id: 'n1', type, data, category: 'TRANSACTIONAL', title: '', body: '', createdAt: '2026-10-15T00:00:00Z' }) as
    unknown as components['schemas']['NotificationDto'];

describe('notificationHref', () => {
  it.each([
    ['message.new', { conversationId: 'c1' }, '/messages/c1'],
    ['assignment.accepted', { assignmentId: 'a1', errandId: 'e1' }, '/assignments/a1'],
    ['execution.delivered', { assignmentId: 'a1' }, '/assignments/a1'],
    ['change_request.created', { assignmentId: 'a1' }, '/assignments/a1'],
    ['offer.new', { offerId: 'o1', errandId: 'e1' }, '/offers/o1'],
    ['dispute.opened', { disputeId: 'd1' }, '/disputes/d1'],
    ['report.resolved', { reportId: 'r1' }, '/reports/r1'],
    ['enforcement.warning', { actionId: 'x' }, '/account/standing'],
    ['verification.completed', {}, '/verification'],
    ['rating.received', { ratingId: 'g1' }, '/ratings'],
    ['badge.awarded', {}, '/ratings'],
    ['account.password_changed', {}, '/settings/security'],
    ['errand.expired', { errandId: 'e1' }, '/errands/e1'],
    ['system.announcement', {}, '/dashboard'],
  ])('%s opens %s', (type, data, href) => {
    expect(notificationHref(make(type, data))).toBe(href);
  });

  it('encodes ids', () => {
    expect(notificationHref(make('message.new', { conversationId: 'a/b' }))).toBe('/messages/a%2Fb');
  });
});
