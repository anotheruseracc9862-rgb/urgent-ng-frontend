'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { messagingApi, type ConversationFilter } from './api';

const FILTERS: { value: ConversationFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OFFERS', label: 'Offers' },
  { value: 'CLOSED', label: 'Closed' },
];

export function ConversationListPage() {
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
  const forbidden = isApiError(conversations.error) && conversations.error.status === 403;

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Your conversations</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Messages</h1>
        <p className="mt-1 text-sm text-muted">Discuss errand details with the other person.</p>
      </header>
      <label className="grid gap-1 text-xs font-bold text-ink-2">
        Search conversations
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search by errand or person"
          className="h-11 rounded-xl border border-line bg-surface px-4 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-lime-600"
        />
      </label>
      <div className="flex flex-wrap gap-2" aria-label="Conversation filters">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-10 rounded-full px-4 text-xs font-bold ${filter === value ? 'bg-ink text-white' : 'bg-panel text-ink-2 hover:bg-tint-2'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {conversations.isPending ? (
        <div className="grid gap-3" aria-label="Loading conversations">
          <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
      ) : conversations.error || !conversations.data ? (
        <Alert variant="danger" role="alert">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p>{forbidden ? 'You do not have permission to view messages.' : 'We could not load your conversations.'}</p>
              {isApiError(conversations.error) && conversations.error.requestId ? <p className="mt-1 text-xs">Request ID: {conversations.error.requestId}</p> : null}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => void conversations.refetch()}>Try again</Button>
          </div>
        </Alert>
      ) : items.length === 0 ? (
        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-8 text-center shadow-[var(--shadow)]">
          <h2 className="text-sm font-extrabold text-ink">No conversations yet</h2>
          <p className="mt-1 text-sm text-muted">When you send or receive an offer, your conversation will appear here.</p>
          <Link href="/marketplace" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-xs font-bold text-white">Explore errands</Link>
        </section>
      ) : (
        <ul className="overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface shadow-[var(--shadow)]">
          {items.map((conversation) => (
            <li key={conversation.id} className="border-b border-line last:border-0">
              <Link
                href={`/messages/${encodeURIComponent(conversation.id)}`}
                className="flex min-h-20 items-center gap-3 p-4 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime-600"
              >
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-tint text-sm font-extrabold text-green-900">
                  {conversation.counterpart.firstName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-ink">{conversation.counterpart.firstName}</strong>
                  <span className="mt-1 block truncate text-xs text-muted">{conversation.errandTitle}</span>
                </span>
                <span className="grid justify-items-end gap-1">
                  {conversation.lastMessageAt ? <time dateTime={conversation.lastMessageAt} className="text-[10px] text-muted">{formatDate(conversation.lastMessageAt, 'short')}</time> : null}
                  {conversation.unreadCount > 0 ? <span className="grid min-w-5 place-items-center rounded-full bg-[#ff5a36] px-1 text-[10px] font-bold leading-5 text-white">{conversation.unreadCount}</span> : null}
                  {!conversation.canSend ? <span className="text-[10px] font-semibold text-muted">Read only</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
