'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';

export async function invalidateBlockRelatedQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.blocks.list(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.errands.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.offers.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all() }),
  ]);
}

export function BlockUserButton({ userId, userName }: { userId: string; userName: string }) {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const mutation = useMutation({
    mutationFn: () => authApi.blockUser(userId),
    onSuccess: async () => {
      await invalidateBlockRelatedQueries(queryClient, me.id);
      setSuccess(true);
      setOpen(false);
    },
  });

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => { mutation.reset(); setSuccess(false); setOpen(true); }}>
        Block
      </Button>
      {success ? <p role="status" className="text-xs font-bold text-green-800">{userName} was blocked.</p> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {userName}?</DialogTitle>
            <DialogDescription>
              They will not be able to offer on your errands, and you will not see theirs. Existing chats become read-only. Blocking does not cancel an errand already in progress.
            </DialogDescription>
          </DialogHeader>
          {mutation.error ? (
            <Alert variant="danger" role="alert">
              <p>{isApiError(mutation.error) && mutation.error.code === 'USER_BLOCKED'
                ? 'This action is not available between these users.'
                : 'We could not block this person. Please try again.'}</p>
              {isApiError(mutation.error) && mutation.error.requestId ? <p className="mt-1 text-xs">Request ID: {mutation.error.requestId}</p> : null}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Blocking…' : 'Block person'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
