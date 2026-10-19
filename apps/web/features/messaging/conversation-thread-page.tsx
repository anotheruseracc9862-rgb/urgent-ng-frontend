'use client';

import { useApiMutation } from '@/lib/query/mutations';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ImagePlus, Info, Send } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { PaymentTermsStrip } from '@/features/assignments/payment/payment-terms-strip';
import { MediaUpload } from '@/components/media/MediaUpload';
import { api, isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { messagingApi, nextMessageIntent, type Message, type SendMessage } from './api';
import { avatarTone, counterpartName, counterpartSubtitle, errandStatusLabel, initialsOf } from './presentation';

const READ_ONLY_COPY: Record<string, string> = {
  BLOCKED: 'You blocked this person, so the conversation is read-only.',
  ERRAND_ENDED: 'This errand ended, so the conversation is read-only.',
  NOT_ASSIGNED: 'Chat opens once the runner accepts this errand. Until then, use the offer note and counter-offers.',
  NO_ACTIVE_OFFER: 'This offer is closed, so the conversation is read-only.',
  COMPLETION_WINDOW_ENDED: 'The window after completion has ended, so the conversation is read-only.',
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });

/**
 * One conversation: header, errand ribbon, the stream and the composer (demo `.chat-thread-pane`).
 * Mute, block, report and payment terms live in the details pane next to it.
 */
export function ConversationThreadPage({ conversationId, onShowDetails }: { conversationId: string; onShowDetails?: () => void }) {
  const { me } = useSession();
  const client = useQueryClient();
  const [body, setBody] = React.useState('');
  const [imageId, setImageId] = React.useState<string | undefined>();
  const [attachOpen, setAttachOpen] = React.useState(false);
  const intent = React.useRef<{ signature: string; clientMessageId: string } | null>(null);
  const streamEnd = React.useRef<HTMLDivElement>(null);

  const conversation = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId),
    queryFn: () => messagingApi.conversation(conversationId),
  });
  const messages = useInfiniteQuery({
    queryKey: queryKeys.conversations.messages(conversationId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => messagingApi.messages(conversationId, pageParam),
    getNextPageParam: (page) => typeof page.meta?.nextCursor === 'string' ? page.meta.nextCursor : undefined,
    enabled: conversation.isSuccess,
  });
  const messageList = messages.data?.pages.slice().reverse().flatMap((page) => page.data.slice().reverse()) ?? [];
  const latestId = messageList.at(-1)?.id;

  const markRead = useApiMutation({ affects: ['conversations'],
    mutationFn: (messageId: string) => messagingApi.read(conversationId, messageId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.conversations.all() });
    },
  });

  React.useEffect(() => {
    if (!messageList.length) return;
    const latest = messageList.at(-1);
    if (latest && latest.senderId !== me.id) markRead.mutate(latest.id);
  // The most recent message id is sufficient; unrelated renders must not repeat the request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, latestId, me.id]);

  React.useEffect(() => {
    streamEnd.current?.scrollIntoView?.({ block: 'end' });
  }, [latestId, conversationId]);

  const send = useApiMutation({ affects: ['conversations'],
    mutationFn: (input: SendMessage) => messagingApi.send(conversationId, input),
    onSuccess: async () => {
      intent.current = null;
      setBody('');
      setImageId(undefined);
      setAttachOpen(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.conversations.messages(conversationId) }),
        client.invalidateQueries({ queryKey: queryKeys.conversations.all() }),
      ]);
    },
  });
  const remove = useApiMutation({ affects: ['conversations'],
    mutationFn: (id: string) => messagingApi.remove(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.conversations.messages(conversationId) });
    },
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!conversation.data?.canSend || send.isPending) return;
    const input: SendMessage = imageId
      ? { type: 'IMAGE', mediaId: imageId }
      : { type: 'TEXT', body: body.trim() };
    if (input.type === 'TEXT' && !input.body) return;
    const signature = JSON.stringify(input);
    intent.current = nextMessageIntent(intent.current, signature);
    send.mutate({ ...input, clientMessageId: intent.current.clientMessageId });
  };

  if (conversation.isPending) {
    return <div className="grid gap-3 p-4" aria-label="Loading conversation"><Skeleton className="h-14" /><Skeleton className="h-72" /></div>;
  }
  if (conversation.error || !conversation.data) {
    const notFound = isApiError(conversation.error) && conversation.error.status === 404;
    return (
      <div className="grid gap-4 p-5">
        <h1 className="text-xl font-extrabold text-ink">Conversation</h1>
        <Alert variant="danger" role="alert">
          <p>{notFound ? 'This conversation was not found.' : 'We could not load this conversation.'}</p>
          {isApiError(conversation.error) && conversation.error.requestId ? <p className="mt-1 text-xs">Request ID: {conversation.error.requestId}</p> : null}
          {!notFound ? <Button type="button" variant="ghost" size="sm" onClick={() => void conversation.refetch()}>Try again</Button> : null}
        </Alert>
      </div>
    );
  }

  const current = conversation.data;
  const readOnlyMessage = current.readOnlyReason ? READ_ONLY_COPY[current.readOnlyReason] ?? 'This conversation is read-only.' : null;
  const status = errandStatusLabel(current.errandStatus);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-[18px] py-3.5">
        <Link href="/messages" aria-label="Back to conversations" className="grid size-[42px] place-items-center rounded-full bg-panel text-ink-2 hover:bg-tint-2 lg:hidden">
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Link>
        <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-extrabold ${avatarTone(current.id)}`}>
          {initialsOf(current.counterpart.firstName, current.counterpart.lastName)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-extrabold text-ink">{counterpartName(current.counterpart)}</h1>
          <p className="truncate text-xs text-muted">{counterpartSubtitle(current.counterpart)}</p>
        </div>
        {onShowDetails ? (
          <button
            type="button"
            onClick={onShowDetails}
            aria-label="Errand details"
            className="grid size-[42px] place-items-center rounded-full bg-panel text-ink-2 hover:bg-tint-2 xl:hidden"
          >
            <Info aria-hidden="true" className="size-[19px]" />
          </button>
        ) : null}
      </header>

      <div className="flex items-center justify-between gap-3 bg-tint px-[18px] py-2.5 text-[12.5px] font-bold text-green-900">
        <span className="min-w-0 truncate">{current.errandTitle}</span>
        <span className="shrink-0 rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold">{status}</span>
      </div>

      <div aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-panel p-5">
        {messages.error ? (
          <Alert variant="danger" role="alert">
            <p>We could not load the messages.</p>
            {isApiError(messages.error) && messages.error.requestId ? <p className="mt-1 text-xs">Request ID: {messages.error.requestId}</p> : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => void messages.refetch()}>Try again</Button>
          </Alert>
        ) : null}
        {messages.isLoading ? <Skeleton className="h-40" aria-label="Loading messages" /> : null}
        {messages.hasNextPage ? (
          <Button type="button" variant="ghost" size="sm" className="self-center" disabled={messages.isFetchingNextPage} onClick={() => void messages.fetchNextPage()}>
            {messages.isFetchingNextPage ? 'Loading older messages…' : 'Load older messages'}
          </Button>
        ) : null}
        {messageList.map((message) => (
          <Bubble
            key={message.id}
            message={message}
            own={message.senderId === me.id}
            onRemove={() => remove.mutate(message.id)}
            busy={remove.isPending}
          />
        ))}
        {!messageList.length && !messages.isLoading && !messages.error ? (
          <p className="m-auto py-10 text-center text-sm text-muted">Start the conversation with a message about this errand.</p>
        ) : null}
        <div ref={streamEnd} />
      </div>

      {send.error ? (
        <div className="border-t border-line p-3">
          <Alert variant="danger" role="alert">
            <p>{isApiError(send.error) && send.error.code === 'CONVERSATION_READ_ONLY' ? 'This conversation is now read-only.' : 'Your message could not be sent. Retry to send it once.'}</p>
            {isApiError(send.error) && send.error.requestId ? <p className="mt-1 text-xs">Request ID: {send.error.requestId}</p> : null}
          </Alert>
        </div>
      ) : null}
      {remove.error || markRead.error ? (
        <div className="border-t border-line p-3"><Alert variant="danger" role="alert"><p>We could not update this conversation. Please try again.</p></Alert></div>
      ) : null}

      {readOnlyMessage || !current.canSend ? (
        <div role="status" className="border-t border-line bg-surface px-[18px] py-3.5 text-center text-[13px] font-semibold text-muted">
          {readOnlyMessage ?? 'Messaging is unavailable for this conversation.'}
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-3 border-t border-line p-3.5">
          {current.assignmentId ? (
            <PaymentTermsStrip assignmentId={current.assignmentId} role={current.counterpart.role === 'RUNNER' ? 'REQUESTER' : 'RUNNER'} />
          ) : null}
          {attachOpen ? (
            <MediaUpload purpose="CHAT_IMAGE" maxFiles={1} value={imageId ? [imageId] : []} onChange={(ids) => setImageId(ids[0])} />
          ) : null}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAttachOpen((open) => !open)}
              aria-label="Attach photo"
              aria-pressed={attachOpen}
              className="grid size-[42px] shrink-0 place-items-center rounded-full bg-panel text-ink-2 hover:bg-tint-2 aria-pressed:bg-tint-2"
            >
              <ImagePlus aria-hidden="true" className="size-[18px]" />
            </button>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Message</span>
              <input
                value={body}
                onChange={(event) => setBody(event.currentTarget.value)}
                maxLength={2000}
                disabled={Boolean(imageId) || send.isPending}
                placeholder="Type a message"
                autoComplete="off"
                className="min-h-12 w-full rounded-full border border-line bg-surface px-4 text-sm outline-none focus-visible:border-lime-600 focus-visible:ring-4 focus-visible:ring-lime/25 disabled:opacity-60"
              />
            </label>
            <Button type="submit" disabled={send.isPending || (!imageId && !body.trim())}>
              <Send aria-hidden="true" className="size-4" />
              {send.isPending ? 'Sending…' : send.error ? 'Retry message' : 'Send'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

function Bubble({ message, own, onRemove, busy }: { message: Message; own: boolean; onRemove: () => void; busy: boolean }) {
  if (message.type === 'SYSTEM') {
    return (
      <div className="max-w-[90%] self-center rounded-full border border-dashed border-[#cfd6c8] px-3.5 py-1.5 text-center text-xs text-muted">
        {message.body}
      </div>
    );
  }
  const removed = message.status === 'REMOVED';
  return (
    <div
      className={`max-w-[76%] rounded-[18px] px-[15px] py-[11px] text-sm shadow-[0_1px_2px_rgba(23,33,46,.06)] ${own ? 'self-end rounded-br-md bg-ink text-white' : 'self-start rounded-bl-md bg-surface text-ink'}`}
    >
      {removed ? <p className="italic opacity-75">This message was removed.</p>
        : message.type === 'IMAGE' && message.mediaId ? <ChatImage mediaId={message.mediaId} />
        : <p className="whitespace-pre-wrap break-words">{message.body}</p>}
      <small className="mt-1 flex flex-wrap items-center justify-end gap-x-2 text-[11px] opacity-70">
        <time dateTime={message.createdAt}>{timeOf(message.createdAt)}</time>
        {own && !removed ? <span>{message.status === 'READ' ? 'Read' : message.status === 'DELIVERED' ? 'Delivered' : 'Sent'}</span> : null}
        {own && !removed ? <button type="button" disabled={busy} onClick={onRemove} className="underline">Delete</button> : null}
        {!own && !removed ? (
          <Link href={`/report?targetType=MESSAGE&targetId=${encodeURIComponent(message.id)}`} className="underline">Report</Link>
        ) : null}
      </small>
    </div>
  );
}

function ChatImage({ mediaId }: { mediaId: string }) {
  const image = useQuery({
    queryKey: queryKeys.media.url(mediaId),
    queryFn: () => api<{ url: string }>(`/media/${encodeURIComponent(mediaId)}/url`),
    staleTime: 2 * 60_000,
  });
  if (image.isPending) return <Skeleton className="h-40 w-56" aria-label="Loading shared image" />;
  if (image.error || !image.data?.url) return <p role="status" className="text-xs">Image unavailable.</p>;
  return <Image src={image.data.url} alt="Shared image" width={640} height={480} unoptimized className="max-h-72 w-auto rounded-lg object-contain" />;
}
