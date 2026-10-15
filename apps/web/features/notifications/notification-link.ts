import type { components } from '@urgent/api-client';

type Notification = components['schemas']['NotificationDto'];

function dataId(notification: Notification, key: string): string | undefined {
  const value = notification.data[key];
  return typeof value === 'string' && value.length > 0 ? encodeURIComponent(value) : undefined;
}

export function notificationHref(notification: Notification): string {
  const type = notification.type;
  const conversationId = dataId(notification, 'conversationId');
  if ((type.startsWith('message.') || type.startsWith('conversation.')) && conversationId) {
    return `/messages/${conversationId}`;
  }

  const disputeId = dataId(notification, 'disputeId');
  if (type.startsWith('dispute.') && disputeId) return `/disputes/${disputeId}`;

  const reportId = dataId(notification, 'reportId');
  if (type.startsWith('report.') && reportId) return `/reports/${reportId}`;

  if (type.startsWith('enforcement.')) return '/account/standing';
  if (type.startsWith('verification.')) return '/verification';
  if (type.startsWith('badge.') || type.startsWith('rating.')) return '/ratings';
  if (type.startsWith('account.')) return '/settings/security';

  const assignmentId = dataId(notification, 'assignmentId');
  if ((type.startsWith('assignment.') || type.startsWith('execution.') ||
    type.startsWith('change_request.') || type.startsWith('payment_agreement.') ||
    type.startsWith('no_show.')) && assignmentId) {
    return `/assignments/${assignmentId}`;
  }

  const offerId = dataId(notification, 'offerId');
  if (type.startsWith('offer.') && offerId) return `/offers/${offerId}`;

  const errandId = dataId(notification, 'errandId');
  if (errandId) return `/errands/${errandId}`;
  return '/dashboard';
}
