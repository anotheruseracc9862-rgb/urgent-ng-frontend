import { ConversationThreadPage } from '@/features/messaging/conversation-thread-page';

export default async function ConversationRoute({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <ConversationThreadPage conversationId={conversationId} />;
}
