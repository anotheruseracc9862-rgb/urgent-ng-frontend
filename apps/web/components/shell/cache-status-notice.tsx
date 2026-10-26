'use client';

import * as React from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Alert, Button } from '@urgent/ui';

function countRefreshFailures(client: QueryClient): number {
  return client.getQueryCache().findAll({ type: 'active' }).filter(
    (query) => query.state.status === 'error' && query.state.data !== undefined && query.state.fetchStatus === 'idle',
  ).length;
}

/**
 * When a background refresh fails the page keeps showing the last answer. Say so once, here,
 * instead of in every screen, and offer a retry. Answers stay on screen; they are never replaced
 * by an empty state because a refresh failed.
 */
export function CacheStatusNotice() {
  const client = useQueryClient();
  const failed = React.useSyncExternalStore(
    (notify) => client.getQueryCache().subscribe(notify),
    () => countRefreshFailures(client),
    () => 0,
  );

  if (failed === 0) return null;

  return (
    <Alert variant="warn" role="status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p><strong>Showing saved information.</strong> Some parts of this page could not be refreshed.</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void client.refetchQueries({
            predicate: (query) => query.state.status === 'error' && query.state.data !== undefined,
          })}
        >
          Retry
        </Button>
      </div>
    </Alert>
  );
}
