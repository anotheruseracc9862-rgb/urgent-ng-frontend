'use client';

import { useApiMutation } from '@/lib/query/mutations';
import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, MessageSquare, Search, ShieldCheck } from 'lucide-react';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@urgent/ui';
import { formatRelativeTime } from '@urgent/utils';
import { BlockUserButton } from '@/features/blocks/block-user-button';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { messagingApi, type Conversation, type ConversationFilter } from './api';
import { ConversationThreadPage } from './conversation-thread-page';
import { avatarTone, counterpartName, errandStatusLabel, initialsOf, money } from './presentation';

const FILTERS: Array<{ value: ConversationFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
];

const PANE = 'flex min-h-0 flex-col overflow-hidden rounded-[var(--r-lg)] bg-surface shadow-[var(--shadow)]';

function ConversationList({ activeId }: { activeId?: string }) {
  const [filter, setFilter] = React.useState<ConversationFilter>('ALL');
  const [search, setSearch] = React.useState('');
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const conversations = useQuery({
    queryKey: queryKeys.conversations.list({ filter, q: query }),
    queryFn: () => messagingApi.conversations(filter, query),
  });
  const items = conversations.data?.data ?? [];
  const unread = items.reduce((total, item) => total + item.unreadCount, 0);
  const forbidden = isApiError(conversations.error) && conversations.error.status === 403;

  return (
    <>
      <div className="px-[18px] pb-2.5 pt-[18px]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-extrabold text-ink">Messages</h1>
          <span className="inline-flex rounded-full bg-tint-2 px-2.5 py-1 text-[11.5px] font-bold text-green-900">
            {unread ? `${unread} unread` : 'All read'}
          </span>
        </div>
        <label className="relative mt-3 block">
          <span className="sr-only">Search conversations</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search errands or people"
            className="h-[42px] w-full rounded-full bg-panel pl-10 pr-4 text-[13px] outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-lime-600"
          />
        </label>
        <div role="group" aria-label="Conversation filters" className="mt-3 inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-panel p-1 [scrollbar-width:none]">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors ${filter === value ? 'bg-surface text-ink shadow-[0_1px_4px_rgba(23,33,46,.12)]' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {conversations.isPending ? (
          <div className="grid gap-2 p-2" aria-label="Loading conversations">
            <Skeleton className="h-[72px]" /><Skeleton className="h-[72px]" /><Skeleton className="h-[72px]" />
          </div>
        ) : conversations.error || !conversations.data ? (
          <div className="p-2">
            <Alert variant="danger" role="alert">
              <p>{forbidden ? 'You do not have permission to view messages.' : 'We could not load your conversations.'}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => void conversations.refetch()}>Try again</Button>
            </Alert>
          </div>
        ) : items.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-5 py-10 text-center">
            <h2 className="text-[15px] font-extrabold text-ink">{query ? 'No matches' : 'No conversations yet'}</h2>
            <p className="text-sm text-muted">{query ? 'Try a different name or errand.' : 'Conversations appear when you send or receive an offer.'}</p>
            {!query ? <Link href="/marketplace" className="mt-1 inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-xs font-bold text-white">Explore errands</Link> : null}
          </div>
        ) : (
          <ul className="grid min-w-0 grid-cols-1 gap-0.5">
            {items.map((conversation) => (
              <li key={conversation.id} className="min-w-0">
                <Link
                  href={`/messages/${encodeURIComponent(conversation.id)}`}
                  aria-current={conversation.id === activeId ? 'page' : undefined}
                  className={`flex min-w-0 gap-3 rounded-[var(--r)] p-3 text-left transition-colors hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime-600 ${conversation.id === activeId ? 'bg-tint' : ''}`}
                >
                  <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-extrabold ${avatarTone(conversation.id)}`}>
                    {initialsOf(conversation.counterpart.firstName, conversation.counterpart.lastName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-[13.5px] text-ink">{counterpartName(conversation.counterpart)}</b>
                      {conversation.lastMessageAt ? <time dateTime={conversation.lastMessageAt} className="shrink-0 text-[11px] text-faint">{formatRelativeTime(conversation.lastMessageAt)}</time> : null}
                    </span>
                    <span className="block truncate text-[11.5px] font-bold text-green-700">{conversation.errandTitle}</span>
                    <span className="block truncate text-[12.5px] text-muted">{conversation.lastMessagePreview ?? 'No messages yet'}</span>
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center self-center rounded-full bg-[#ff5a36] px-1.5 text-[10px] font-extrabold text-white">
                      <span className="sr-only">Unread: </span>{conversation.unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-line-2 py-2.5 first:border-0">
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className="text-right text-[13px] font-bold text-ink">{value}</dd>
    </div>
  );
}

/** Errand details for the open conversation, with the actions the demo keeps in this column. */
function ConversationDetails({ conversation }: { conversation: Conversation }) {
  const client = useQueryClient();
  const mute = useApiMutation({ affects: ['conversations'],
    mutationFn: (next: boolean) => messagingApi.mute(conversation.id, next),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.conversations.all() });
    },
  });
  const iAmRequester = conversation.counterpart.role === 'RUNNER';
  const errandHref = iAmRequester
    ? `/errands/${encodeURIComponent(conversation.errandId)}`
    : conversation.assignmentId
      ? `/assignments/${encodeURIComponent(conversation.assignmentId)}`
      : `/marketplace/${encodeURIComponent(conversation.errandId)}`;
  const action = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[13.5px] font-bold';

  return (
    <div className="overflow-y-auto overflow-x-hidden p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-green">Errand</p>
      <h2 className="text-base font-extrabold leading-snug text-ink">{conversation.errandTitle}</h2>

      <dl className="mt-4">
        <DetailRow label="Status" value={errandStatusLabel(conversation.errandStatus)} />
        {conversation.amountMinor !== null ? (
          <DetailRow label={conversation.amountKind === 'AGREED' ? 'Agreed amount' : 'Offer'} value={money(conversation.amountMinor)} />
        ) : null}
        {conversation.pickupArea ? <DetailRow label="Pickup" value={conversation.pickupArea} /> : null}
        {conversation.destinationArea ? <DetailRow label="Drop-off" value={conversation.destinationArea} /> : null}
      </dl>

      <div className="mt-4 flex items-start gap-3 rounded-[var(--r)] bg-tint px-4 py-3.5 text-[13px] leading-relaxed text-green-900">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" />
        <span>Keep coordination here. Never share OTPs, passwords or card details in chat.</span>
      </div>

      <div className="mt-4 grid gap-2">
        <Link href={errandHref} className={`${action} bg-ink text-white hover:bg-[#0f1822]`}>Open errand</Link>
        {conversation.assignmentId ? (
          <Link href={`/assignments/${encodeURIComponent(conversation.assignmentId)}/payment`} className={`${action} bg-panel text-ink hover:bg-tint-2`}>Payment terms</Link>
        ) : null}
        <Link
          href={`/report?targetType=USER&targetId=${encodeURIComponent(conversation.counterpart.userId)}`}
          className={`${action} bg-panel text-ink hover:bg-tint-2`}
        >
          <Flag aria-hidden="true" className="size-4" />Report
        </Link>
        <button
          type="button"
          disabled={mute.isPending}
          onClick={() => mute.mutate(!conversation.muted)}
          className={`${action} bg-panel text-ink hover:bg-tint-2 disabled:opacity-60`}
        >
          {conversation.muted ? 'Unmute conversation' : 'Mute conversation'}
        </button>
        {mute.error ? <p role="alert" className="text-xs font-bold text-red">We could not update this conversation. Please try again.</p> : null}
        <BlockUserButton
          userId={conversation.counterpart.userId}
          userName={conversation.counterpart.firstName}
          label={`Block ${conversation.counterpart.firstName}`}
          variant="danger"
          fullWidth
        />
      </div>
    </div>
  );
}

function ConversationDetailsPane({ conversationId }: { conversationId: string }) {
  const conversation = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId),
    queryFn: () => messagingApi.conversation(conversationId),
  });
  if (conversation.isPending) return <div className="grid gap-3 p-5"><Skeleton className="h-6 w-24" /><Skeleton className="h-24" /></div>;
  if (!conversation.data) return null;
  return <ConversationDetails conversation={conversation.data} />;
}

/**
 * Messages as one workspace (demo `chat.html`): the list, the open conversation and its errand
 * details side by side on a wide screen; one at a time on a phone.
 */
export function MessagesWorkspace({ activeId }: { activeId?: string }) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-150px)] lg:min-h-[560px] lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)_320px]">
      <section aria-label="Conversations" className={`${PANE} ${activeId ? 'hidden lg:flex' : 'flex'} max-lg:h-[calc(100dvh-10rem)] max-lg:min-h-[420px]`}>
        <ConversationList activeId={activeId} />
      </section>

      <section aria-label="Conversation" className={`${PANE} ${activeId ? 'flex' : 'hidden lg:flex'} max-lg:h-[calc(100dvh-10rem)] max-lg:min-h-[420px]`}>
        {activeId ? (
          <ConversationThreadPage conversationId={activeId} onShowDetails={() => setDetailsOpen(true)} />
        ) : (
          <div className="m-auto grid justify-items-center gap-2 px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-[18px] bg-panel text-ink-2"><MessageSquare aria-hidden="true" className="size-6" /></span>
            <h2 className="text-[15px] font-extrabold text-ink">Select a conversation</h2>
            <p className="max-w-xs text-sm text-muted">Choose someone from the list to read and reply.</p>
          </div>
        )}
      </section>

      {activeId ? (
        <>
          <aside aria-label="Errand details" className={`${PANE} hidden xl:flex`}>
            <ConversationDetailsPane conversationId={activeId} />
          </aside>
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto p-0 xl:hidden">
              <DialogHeader className="sr-only">
                <DialogTitle>Errand details</DialogTitle>
                <DialogDescription>Status, amount and actions for this conversation.</DialogDescription>
              </DialogHeader>
              <ConversationDetailsPane conversationId={activeId} />
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
