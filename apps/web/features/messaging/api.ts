import type { components } from '@urgent/api-client';
import { api, apiResponse } from '@/lib/api/client';

export type Conversation = Omit<components['schemas']['ConversationDto'], 'counterpart'> & {
  counterpart: {
    userId: string;
    firstName: string;
    photoMediaId: string | null;
  };
};
export type Message = components['schemas']['MessageDto'];
export type SendMessage = components['schemas']['SendMessageDto'];
export type ConversationFilter = 'ALL' | 'ACTIVE' | 'OFFERS' | 'CLOSED';

export const messagingApi = {
  conversations: (filter: ConversationFilter, q: string) =>
    apiResponse<Conversation[]>('/conversations', {
      query: { filter, q: q || undefined, limit: 20 },
    }),
  conversation: (id: string) => api<Conversation>(`/conversations/${encodeURIComponent(id)}`),
  messages: (id: string, cursor?: string) =>
    apiResponse<Message[]>(`/conversations/${encodeURIComponent(id)}/messages`, {
      query: { cursor, limit: 30 },
    }),
  send: (id: string, body: SendMessage) =>
    api<Message>(`/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', body }),
  read: (id: string, upToMessageId?: string) =>
    api<{ marked: number }>(`/conversations/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      body: upToMessageId ? { upToMessageId } : {},
    }),
  mute: (id: string, muted: boolean) =>
    api<{ muted: boolean }>(`/conversations/${encodeURIComponent(id)}/${muted ? 'mute' : 'unmute'}`, {
      method: 'POST',
      body: {},
    }),
  remove: (id: string) => api<Message>(`/messages/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export function notificationConversationHref(id: string): string {
  return `/messages/${encodeURIComponent(id)}`;
}

export function nextMessageIntent(
  previous: { signature: string; clientMessageId: string } | null,
  signature: string,
): { signature: string; clientMessageId: string } {
  return previous?.signature === signature
    ? previous
    : { signature, clientMessageId: crypto.randomUUID() };
}
