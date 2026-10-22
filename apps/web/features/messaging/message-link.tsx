import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Button } from '@urgent/ui';

/** Opens the conversation. Rendered only once messages are open, which is when the server sends an id. */
export function MessageLink({ conversationId, name }: { conversationId: string | null | undefined; name?: string }) {
  if (!conversationId) return null;
  return (
    <Button asChild variant="ghost">
      <Link href={`/messages/${encodeURIComponent(conversationId)}`}>
        <MessageCircle aria-hidden="true" className="mr-2 size-4" />Message{name ? ` ${name}` : ''}
      </Link>
    </Button>
  );
}
