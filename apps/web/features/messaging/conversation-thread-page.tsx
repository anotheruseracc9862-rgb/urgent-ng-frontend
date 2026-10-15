'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { MediaUpload } from '@/components/media/MediaUpload';
import { BlockUserButton } from '@/features/blocks/block-user-button';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { api } from '@/lib/api/client';
import { messagingApi, nextMessageIntent, type Message, type SendMessage } from './api';

const READ_ONLY_COPY: Record<NonNullable<Awaited<ReturnType<typeof messagingApi.conversation>>['readOnlyReason']>, string> = {
  BLOCKED: 'This conversation is read-only because one of you blocked the other.',
  ERRAND_ENDED: 'This conversation is read-only because the errand has ended.',
  NO_ACTIVE_OFFER: 'This conversation is read-only because there is no active offer.',
  COMPLETION_WINDOW_ENDED: 'This conversation is read-only because the completion window has ended.',
};

export function ConversationThreadPage({ conversationId }: { conversationId: string }) {
  const { me } = useSession();
  const client = useQueryClient();
  const [body, setBody] = React.useState('');
  const [imageId, setImageId] = React.useState<string | undefined>();
  const intent = React.useRef<{ signature: string; clientMessageId: string } | null>(null);
  const conversationKey = queryKeys.conversations.detail(conversationId);

  const conversation = useQuery({
    queryKey: conversationKey,
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

  const markRead = useMutation({
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
  }, [conversationId, messageList.at(-1)?.id, me.id]);

  const send = useMutation({
    mutationFn: (input: SendMessage) => messagingApi.send(conversationId, input),
    onSuccess: async () => {
      intent.current = null;
      setBody('');
      setImageId(undefined);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.conversations.messages(conversationId) }),
        client.invalidateQueries({ queryKey: queryKeys.conversations.all() }),
      ]);
    },
  });
  const mute = useMutation({
    mutationFn: (next: boolean) => messagingApi.mute(conversationId, next),
    onSuccess: async (result) => {
      client.setQueryData(conversationKey, (current: typeof conversation.data) =>
        current ? { ...current, muted: result.muted } : current);
      await client.invalidateQueries({ queryKey: queryKeys.conversations.all() });
    },
  });
  const remove = useMutation({
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
    const signature = JSON.stringify(input);
    intent.current = nextMessageIntent(intent.current, signature);
    send.mutate({ ...input, clientMessageId: intent.current.clientMessageId });
  };

  if (conversation.isLoading) return <div className="mx-auto grid max-w-3xl gap-3" aria-label="Loading conversation"><Skeleton className="h-16" /><Skeleton className="h-72" /></div>;
  if (conversation.error || !conversation.data) {
    const notFound = isApiError(conversation.error) && conversation.error.status === 404;
    return (
      <div className="mx-auto grid max-w-3xl gap-4">
        <h1 className="text-2xl font-extrabold text-ink">Conversation</h1>
        <Alert variant="danger" role="alert">
          <p>{notFound ? 'This conversation was not found.' : 'We could not load this conversation.'}</p>
          {isApiError(conversation.error) && conversation.error.requestId ? <p className="mt-1 text-xs">Request ID: {conversation.error.requestId}</p> : null}
          {!notFound ? <Button type="button" variant="ghost" size="sm" onClick={() => void conversation.refetch()}>Try again</Button> : null}
        </Alert>
      </div>
    );
  }

  const current = conversation.data;
  const readOnlyMessage = current.readOnlyReason ? READ_ONLY_COPY[current.readOnlyReason] : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <header className="flex flex-wrap items-center gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <Link href="/messages" aria-label="Back to messages" className="grid size-10 place-items-center rounded-full bg-panel font-bold text-ink">←</Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-extrabold text-ink">{current.counterpart.firstName}</h1>
          <p className="truncate text-xs text-muted">{current.errandTitle}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={mute.isPending} onClick={() => mute.mutate(!current.muted)}>
          {current.muted ? 'Unmute' : 'Mute'}
        </Button>
        <BlockUserButton userId={current.counterpart.userId} userName={current.counterpart.firstName} />
        <Link
          href={`/report?targetType=USER&targetId=${encodeURIComponent(current.counterpart.userId)}`}
          className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-bold text-muted underline"
        >
          Report
        </Link>
      </header>

      {readOnlyMessage ? <Alert variant="info" role="status"><p>{readOnlyMessage}</p></Alert> : null}
      {messages.error ? (
        <Alert variant="danger" role="alert">
          <p>We could not load the messages.</p>
          {isApiError(messages.error) && messages.error.requestId ? <p className="mt-1 text-xs">Request ID: {messages.error.requestId}</p> : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => void messages.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      <section aria-label="Conversation messages" className="flex min-h-[55vh] flex-col rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        {messages.isLoading ? <Skeleton className="h-40" aria-label="Loading messages" /> : null}
        {messages.hasNextPage ? (
          <Button type="button" variant="ghost" size="sm" disabled={messages.isFetchingNextPage} onClick={() => void messages.fetchNextPage()}>
            {messages.isFetchingNextPage ? 'Loading older messages…' : 'Load older messages'}
          </Button>
        ) : null}
        <ol className="mt-3 grid content-end gap-3">
          {messageList.map((message) => (
            <MessageRow key={message.id} message={message} own={message.senderId === me.id} onRemove={() => remove.mutate(message.id)} busy={remove.isPending} />
          ))}
        </ol>
        {!messageList.length && !messages.isLoading && !messages.error ? <p className="py-10 text-center text-sm text-muted">Start the conversation with a message about this errand.</p> : null}
      </section>

      {send.error ? (
        <Alert variant="danger" role="alert">
          <p>{isApiError(send.error) && send.error.code === 'CONVERSATION_READ_ONLY' ? 'This conversation is now read-only.' : 'Your message could not be sent. Retry to send it once.'}</p>
          {isApiError(send.error) && send.error.requestId ? <p className="mt-1 text-xs">Request ID: {send.error.requestId}</p> : null}
        </Alert>
      ) : null}
      {remove.error || mute.error ? <Alert variant="danger" role="alert"><p>We could not update this conversation. Please try again.</p></Alert> : null}
      {markRead.error ? <Alert variant="danger" role="alert"><p>We could not update the read receipt. Messages will be marked read when you retry.</p></Alert> : null}

      <form onSubmit={submit} className="grid gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)]">
        {!readOnlyMessage && current.canSend ? (
          <>
            <label className="grid gap-1 text-xs font-bold text-ink-2">
              Message
              <textarea value={body} onChange={(event) => setBody(event.currentTarget.value)} maxLength={2000} rows={3} disabled={Boolean(imageId) || send.isPending} placeholder="Write a message…" className="rounded-xl border border-line bg-panel p-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-lime-600 disabled:opacity-60" />
              <span className="text-right font-normal text-muted">{body.length}/2000</span>
            </label>
            <MediaUpload purpose="CHAT_IMAGE" maxFiles={1} value={imageId ? [imageId] : []} onChange={(ids) => setImageId(ids[0])} />
            <div className="flex justify-end">
              <Button type="submit" disabled={send.isPending || (!imageId && !body.trim())}>
                {send.isPending ? 'Sending…' : send.error ? 'Retry message' : 'Send'}
              </Button>
            </div>
          </>
        ) : <p className="text-sm text-muted">Messaging is unavailable for this conversation.</p>}
      </form>
    </div>
  );
}

function MessageRow({ message, own, onRemove, busy }: { message: Message; own: boolean; onRemove: () => void; busy: boolean }) {
  return (
    <li className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <article className={`max-w-[85%] rounded-2xl px-4 py-3 ${own ? 'bg-ink text-white' : 'bg-panel text-ink'}`}>
        {message.status === 'REMOVED' ? <p className="text-sm italic opacity-75">This message was removed.</p>
          : message.type === 'IMAGE' && message.mediaId ? <ChatImage mediaId={message.mediaId} />
          : <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>}
        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-75">
          <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          {own ? <span aria-label={`Message ${message.status.toLowerCase()}`}>{message.status === 'READ' ? 'Read' : message.status === 'DELIVERED' ? 'Delivered' : message.status === 'REMOVED' ? '' : 'Sent'}</span> : null}
          {own && message.status !== 'REMOVED' ? <button type="button" disabled={busy} onClick={onRemove} className="underline">Delete</button> : null}
          {!own && message.type !== 'SYSTEM' && message.status !== 'REMOVED' ? (
            <Link href={`/report?targetType=MESSAGE&targetId=${encodeURIComponent(message.id)}`} className="underline">Report</Link>
          ) : null}
        </div>
      </article>
    </li>
  );
}

function ChatImage({ mediaId }: { mediaId: string }) {
  const image = useQuery({
    queryKey: queryKeys.media.url(mediaId),
    queryFn: () => api<{ url: string }>(`/media/${encodeURIComponent(mediaId)}/url`),
    staleTime: 2 * 60_000,
  });
  if (image.isLoading) return <Skeleton className="h-40 w-56" aria-label="Loading shared image" />;
  if (image.error || !image.data?.url) return <p role="status" className="text-xs">Image unavailable.</p>;
  return <Image src={image.data.url} alt="Shared image" width={640} height={480} unoptimized className="max-h-72 w-auto rounded-lg object-contain" />;
}
