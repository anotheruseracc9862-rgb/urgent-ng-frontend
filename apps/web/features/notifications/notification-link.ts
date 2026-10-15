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
