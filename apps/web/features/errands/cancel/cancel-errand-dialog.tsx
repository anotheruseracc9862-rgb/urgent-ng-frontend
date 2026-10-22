'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@urgent/ui';
import { useApiMutation } from '@/lib/query/mutations';
import { queryKeys } from '@/lib/query/keys';
import { errandsApi } from '../api';
import { cancellationError, consequence } from './cancel-copy';
import { BOOST_CANCEL_NOTICE } from '@/features/billing/boost-notice';

/**
 * Cancel a draft or an open errand with one confirmation, in place. No runner is involved yet, so no
 * reason is asked for (the server records the requester changing their mind) and no page is needed.
 * Once a runner is involved the reason matters and the cancel page asks for it.
 */
export function CancelErrandButton({ errandId, status, offerCount = 0, flow, boosted = false }: {
  errandId: string;
  status: 'DRAFT' | 'OPEN';
  offerCount?: number;
  /** A boost is running on the errand: cancelling ends it, and it is not refunded. */
  boosted?: boolean;
  flow?: 'TRANSIT' | 'SERVICE';
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const draft = status === 'DRAFT';
  const cancel = useApiMutation({
    affects: ['errands'],
    mutationFn: () => errandsApi.cancel(errandId, {}),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.errands.detail(errandId), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.errands.lists() });
      setOpen(false);
      // A deleted draft has nothing left to look at. A cancelled errand stays in view, now marked cancelled.
      if (draft) router.replace('/errands');
    },
  });

  const description = !draft && offerCount > 0
    ? `${offerCount} ${offerCount === 1 ? 'offer' : 'offers'} on it will close, and those runners are told. No runner has been selected.`
    : consequence(status, flow === 'SERVICE');

  return (
    <>
      <Button type="button" variant="danger" onClick={() => { cancel.reset(); setOpen(true); }}>{draft ? 'Delete draft' : 'Cancel'}</Button>
      <Dialog open={open} onOpenChange={(next) => { if (!cancel.isPending) setOpen(next); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft ? 'Delete this draft?' : 'Cancel this errand?'}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {boosted && !draft ? <Alert variant="warn" role="note">{BOOST_CANCEL_NOTICE}</Alert> : null}
          {cancel.error ? <Alert variant="danger" role="alert">{cancellationError(cancel.error, flow)}</Alert> : null}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button type="button" variant="ghost" disabled={cancel.isPending} onClick={() => setOpen(false)}>{draft ? 'Keep draft' : 'Keep errand'}</Button>
            <Button type="button" variant="danger" isLoading={cancel.isPending} onClick={() => cancel.mutate()}>{draft ? 'Delete draft' : 'Cancel errand'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
