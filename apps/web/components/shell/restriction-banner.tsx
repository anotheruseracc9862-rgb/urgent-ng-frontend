'use client';

import { Alert, Button } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';

export function RestrictionBanner() {
  const { me } = useSession();
  const enforcement = useQuery({
    queryKey: queryKeys.account.enforcement(me.id),
    queryFn: authApi.enforcement,
    staleTime: 60_000,
  });
  const action = enforcement.data?.find((item) => item.status === 'ACTIVE' && (
    item.type === 'FEATURE_RESTRICTION' || item.type === 'TEMPORARY_SUSPENSION' || item.type === 'PERMANENT_SUSPENSION'
  ));

  if (enforcement.error) {
    return (
      <Alert variant="warn" role="alert">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>We could not check whether any account restrictions affect your actions.</span>
          <span className="flex items-center gap-3">
            {isApiError(enforcement.error) && enforcement.error.requestId ? <span className="text-xs">Request ID: {enforcement.error.requestId}</span> : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => void enforcement.refetch()}>Retry</Button>
          </span>
        </div>
      </Alert>
    );
  }

  if (!action) return null;
  return (
    <Alert variant="danger" role="status">
      <div>
        <p className="font-extrabold">
          {action.type === 'FEATURE_RESTRICTION' ? 'Some account actions are paused.' : 'Account suspension is active.'}
        </p>
        <p className="mt-1">{action.reason}</p>
        {action.endsAt ? <p className="mt-1 text-xs">Until {formatDate(action.endsAt, 'long')} (Lagos time)</p> : null}
        <a className="mt-2 inline-block font-bold underline" href="/account/standing">View account standing</a>
      </div>
    </Alert>
  );
}
