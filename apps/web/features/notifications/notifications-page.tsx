'use client';

import * as React from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { api, apiResponse, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { notificationHref } from './notification-link';

type Notification = components['schemas']['NotificationDto'];
type Category = Notification['category'] | 'ALL';
type NotificationPage = Awaited<ReturnType<typeof apiResponse<Notification[]>>>;

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'TRANSACTIONAL', label: 'Updates' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'MESSAGING', label: 'Messages' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'MARKETING', label: 'News' },
];

function ErrorNotice({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert variant="danger" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p>We could not load or update your notifications.</p>
          {isApiError(error) && error.requestId ? <p className="mt-1 text-xs">Request ID: {error.requestId}</p> : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    </Alert>
  );
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}) {
  return (
    <li className="border-b border-line py-4 last:border-0">
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex min-h-14 w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600"
        aria-label={`${notification.readAt ? '' : 'Unread: '}${notification.title}`}
      >
        <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.readAt ? 'bg-line' : 'bg-[#ff5a36]'}`} />
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-extrabold text-ink">{notification.title}</strong>
          <span className="mt-1 block text-sm leading-relaxed text-muted">{notification.body}</span>
          <time dateTime={notification.createdAt} className="mt-2 block text-xs text-muted">
            {formatDate(notification.createdAt, 'short')}
          </time>
        </span>
      </button>
    </li>
  );
}

export function NotificationsPage() {
  const router = useRouter();
  const client = useQueryClient();
  const [category, setCategory] = React.useState<Category>('ALL');
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  const notifications = useInfiniteQuery({
    queryKey: queryKeys.notifications.list(undefined, category, unreadOnly),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiResponse<Notification[]>('/notifications', {
      query: {
        cursor: pageParam,
        limit: 20,
        category: category === 'ALL' ? undefined : category,
        unread: unreadOnly ? true : undefined,
      },
    }),
    getNextPageParam: (lastPage: NotificationPage) =>
      typeof lastPage.meta?.nextCursor === 'string' ? lastPage.meta.nextCursor : undefined,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api<Notification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
  const markAllRead = useMutation({
    mutationFn: () => api<{ count: number }>('/notifications/read-all', { method: 'POST', body: {} }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });

  const openNotification = (notification: Notification) => {
    const href = notificationHref(notification);
    if (notification.readAt) {
      router.push(href);
      return;
    }
    markRead.mutate(notification.id, {
      onSuccess: () => router.push(href),
    });
  };

  const items = notifications.data?.pages.flatMap((page) => page.data) ?? [];
  const error = notifications.error ?? markRead.error ?? markAllRead.error;

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Your updates</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Offers, messages, safety updates and errand progress.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          {markAllRead.isPending ? 'Marking read…' : 'Mark all as read'}
        </Button>
      </header>

      {error ? (
        <ErrorNotice
          error={error}
          onRetry={() => {
            markRead.reset();
            markAllRead.reset();
            void notifications.refetch();
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2" aria-label="Notification filters">
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
            className={`min-h-10 rounded-full px-4 text-xs font-bold ${category === value ? 'bg-ink text-white' : 'bg-panel text-ink-2 hover:bg-tint-2'}`}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-ink-2">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => setUnreadOnly(event.currentTarget.checked)}
            className="size-4 accent-lime-700"
          />
          Unread only
        </label>
      </div>

      <section aria-label="Notifications" className="rounded-[var(--r-lg)] border border-line bg-surface px-4 shadow-[var(--shadow)] sm:px-5">
        {notifications.isLoading ? (
          <div className="grid gap-4 py-5" aria-label="Loading notifications">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : error && !notifications.data ? null : !items.length ? (
          <div className="py-12 text-center">
            <h2 className="text-sm font-extrabold text-ink">You’re all caught up</h2>
            <p className="mt-1 text-sm text-muted">New updates about your errands and messages will show up here.</p>
          </div>
        ) : (
          <ul>
            {items.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onOpen={openNotification} />
            ))}
          </ul>
        )}
        {notifications.hasNextPage ? (
          <div className="border-t border-line py-4 text-center">
            <Button type="button" variant="ghost" size="sm" disabled={notifications.isFetchingNextPage} onClick={() => void notifications.fetchNextPage()}>
              {notifications.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
