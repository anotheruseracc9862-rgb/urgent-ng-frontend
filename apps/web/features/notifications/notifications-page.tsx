'use client';

import { useApiMutation } from '@/lib/query/mutations';
import * as React from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, MessageCircle, Megaphone, Repeat2, Settings, ShieldCheck, Star, Tag, Truck } from 'lucide-react';
import { toast } from 'sonner';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton, cn } from '@urgent/ui';
import { formatDate, formatRelativeTime } from '@urgent/utils';
import { api, apiResponse, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { notificationHref } from './notification-link';

type Notification = components['schemas']['NotificationDto'];
type Category = Notification['category'] | 'ALL' | 'OFFERS' | 'PROGRESS';
type NotificationPage = Awaited<ReturnType<typeof apiResponse<Notification[]>>>;

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OFFERS', label: 'Offers' },
  { value: 'PROGRESS', label: 'Progress' },
  { value: 'TRANSACTIONAL', label: 'Updates' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'MESSAGING', label: 'Messages' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'MARKETING', label: 'News' },
];

function notificationAppearance({ type, category }: Notification) {
  if (type.startsWith('offer.')) {
    return type.includes('counter')
      ? { Icon: Repeat2, color: 'bg-violet-bg text-violet' }
      : { Icon: Tag, color: 'bg-amber-bg text-amber' };
  }
  if (type.startsWith('rating.') || type.startsWith('badge.')) return { Icon: Star, color: 'bg-amber-bg text-amber' };
  if (category === 'SAFETY' || type.startsWith('verification.')) return { Icon: ShieldCheck, color: 'bg-red-bg text-red' };
  if (category === 'MESSAGING') return { Icon: MessageCircle, color: 'bg-tint-2 text-green-900' };
  if (type.endsWith('.completed')) return { Icon: Check, color: 'bg-tint-2 text-green-900' };
  if (type.startsWith('execution.') || type.startsWith('assignment.') || type.startsWith('errand.')) {
    return { Icon: Truck, color: 'bg-blue-bg text-blue' };
  }
  if (category === 'MARKETPLACE') return { Icon: Tag, color: 'bg-amber-bg text-amber' };
  if (category === 'MARKETING') return { Icon: Megaphone, color: 'bg-violet-bg text-violet' };
  return { Icon: Bell, color: 'bg-panel text-ink-2' };
}

function ErrorNotice({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert variant="danger" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p>We could not load or update your notifications.</p>
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
  const { Icon, color } = notificationAppearance(notification);

  return (
    <li className="border-t border-line-2 first:border-0">
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="grid min-h-[69px] w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1 rounded-[var(--r-sm)] px-1 py-3.5 text-left transition-[background-color,transform] duration-150 hover:bg-panel active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 motion-reduce:transition-none sm:grid-cols-[40px_minmax(0,1fr)_auto]"
      >
        <span aria-hidden="true" className={cn('grid size-10 place-items-center rounded-[13px]', color)}>
          <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0">
          <strong className="block text-sm font-bold break-words text-ink">
            {!notification.readAt ? <span className="sr-only">Unread: </span> : null}
            {notification.title}
            {!notification.readAt ? <span aria-hidden="true" className="ml-2 inline-block size-2 rounded-full bg-lime-600 align-middle" /> : null}
          </strong>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed break-words text-muted">{notification.body}</span>
        </span>
        <time
          dateTime={notification.createdAt}
          title={formatDate(notification.createdAt, 'medium')}
          className="col-start-2 text-[11px] whitespace-nowrap text-muted sm:col-start-auto sm:text-right"
        >
          {formatRelativeTime(notification.createdAt)}
        </time>
      </button>
    </li>
  );
}

export function NotificationsPage() {
  const router = useRouter();
  const client = useQueryClient();
  const [category, setCategory] = React.useState<Category>('ALL');
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const topic = category === 'OFFERS' || category === 'PROGRESS' ? category : undefined;

  const unread = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => api<{ count: number }>('/notifications/unread-count'),
    staleTime: 30_000,
  });

  const notifications = useInfiniteQuery({
    queryKey: queryKeys.notifications.list(undefined, category, unreadOnly),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiResponse<Notification[]>('/notifications', {
      query: {
        cursor: pageParam,
        limit: 20,
        category: category === 'ALL' || topic ? undefined : category,
        topic,
        unread: unreadOnly ? true : undefined,
      },
    }),
    getNextPageParam: (lastPage: NotificationPage) =>
      typeof lastPage.meta?.nextCursor === 'string' ? lastPage.meta.nextCursor : undefined,
  });

  const markRead = useApiMutation({ affects: ['notifications'],
    mutationFn: (id: string) => api<Notification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
  const markAllRead = useApiMutation({ affects: ['notifications'],
    mutationFn: () => api<{ count: number }>('/notifications/read-all', { method: 'POST', body: {} }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      toast.success('All notifications marked as read.', {
        style: { color: 'var(--ok)', background: 'var(--ok-bg)' },
      });
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
    <div className="grid min-w-0 gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1.5 pt-1">
        <div>
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-green-700">Updates</p>
          <h1 className="text-[clamp(24px,3vw,32px)] leading-[1.15] font-extrabold tracking-[-0.03em] text-ink">Notifications</h1>
          <p className="mt-1.5 text-sm text-muted">Offers, progress, messages and account activity.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 motion-reduce:transform-none motion-reduce:transition-none sm:flex-none"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <Check aria-hidden="true" />
            {markAllRead.isPending ? 'Marking read…' : 'Mark all as read'}
          </Button>
          <Button asChild variant="ghost" className="flex-1 motion-reduce:transform-none motion-reduce:transition-none sm:flex-none">
            <Link href="/settings/notifications"><Settings aria-hidden="true" />Settings</Link>
          </Button>
        </div>
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

      <section aria-label="Notifications" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
        <div role="group" aria-label="Notification filters" className="mb-2.5 flex w-max max-w-full gap-1 overflow-x-auto rounded-full bg-panel p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map(({ value, label }) => (
            <React.Fragment key={value}>
              <button
                type="button"
                aria-pressed={category === value && (value !== 'ALL' || !unreadOnly)}
                onClick={() => {
                  setCategory(value);
                  if (value === 'ALL') setUnreadOnly(false);
                }}
                className={cn(
                  'min-h-11 shrink-0 rounded-full px-4 text-[13px] font-bold whitespace-nowrap transition-[background-color,box-shadow,color] duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime-600 motion-reduce:transition-none sm:min-h-[37px]',
                  category === value && (value !== 'ALL' || !unreadOnly) ? 'bg-surface text-ink shadow-[0_1px_4px_rgba(23,33,46,0.12)]' : 'text-muted hover:bg-surface/60',
                )}
              >
                {label}
              </button>
              {value === 'ALL' ? (
                <label className="relative shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Unread only"
                    checked={unreadOnly}
                    onChange={(event) => setUnreadOnly(event.currentTarget.checked)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-11 items-center gap-[7px] rounded-full px-4 text-[13px] font-bold whitespace-nowrap text-muted transition-[background-color,box-shadow,color] duration-150 hover:bg-surface/60 hover:text-ink peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-[0_1px_4px_rgba(23,33,46,0.12)] peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-lime-600 motion-reduce:transition-none sm:min-h-[37px]">
                    Unread
                    {unread.data ? <span className={cn('rounded-full px-[7px] py-px text-[11px] tabular-nums text-ink-2', unreadOnly ? 'bg-lime' : 'bg-line')}>{unread.data.count}</span> : null}
                  </span>
                </label>
              ) : null}
            </React.Fragment>
          ))}
        </div>

        {notifications.isPending ? (
          <div className="divide-y divide-line-2" role="status" aria-label="Loading notifications">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3.5 px-1 py-3.5" aria-hidden="true">
                <Skeleton className="size-10 shrink-0 rounded-[13px]" />
                <div className="grid flex-1 gap-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-5/6" /></div>
                <Skeleton className="hidden h-3 w-16 sm:block" />
              </div>
            ))}
          </div>
        ) : error && !notifications.data ? null : !items.length ? (
          <div className="grid justify-items-center gap-2.5 px-5 py-10 text-center" role="status">
            <span aria-hidden="true" className="grid size-14 place-items-center rounded-[18px] bg-panel text-ink-2"><Bell className="size-6" /></span>
            <h2 className="text-[15px] font-bold text-ink">You’re all caught up</h2>
            <p className="text-[12.5px] text-muted">{unreadOnly ? 'No unread notifications match your filters.' : category !== 'ALL' ? 'No notifications in this category yet.' : 'New updates about your errands and messages will show up here.'}</p>
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
      <p className="text-center text-xs leading-relaxed text-muted">Updates appear here automatically.</p>
    </div>
  );
}
