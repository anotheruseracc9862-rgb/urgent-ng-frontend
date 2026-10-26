import type { Metadata } from 'next';
import { MessagesWorkspace } from '@/features/messaging/messages-workspace';

export const metadata: Metadata = { title: 'Messages — Urgent.ng' };

export default async function ConversationRoute({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <MessagesWorkspace activeId={conversationId} />;
}
