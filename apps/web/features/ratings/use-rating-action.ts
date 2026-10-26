'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOptionalSession } from '@/lib/auth/client';
import { ratingKeys, ratingsApi } from './api';

export interface RatingAction {
  /** What the button says, or null when there is nothing to offer (not loaded, or the window is closed). */
  label: string | null;
  /** A sentence to show beside it. */
  note: string;
}

const NOTHING: RatingAction = { label: null, note: 'This errand is complete. Review the timeline for the recorded steps.' };

/**
 * What to offer about rating a completed errand: rate it, change a rating that is still editable,
 * look at one already given, or nothing. Reads the same query as the rating page, so React Query
 * shares one copy. Until it has loaded, or if it fails, nothing is offered rather than a button
 * that might be wrong.
 */
export function useRatingAction(assignmentId: string, enabled: boolean): RatingAction {
  const userId = useOptionalSession()?.me.id;
  // Read once on mount: the editing window is minutes or days long, and the render must stay pure.
  const [now] = useState(() => Date.now());
  const query = useQuery({
    queryKey: ratingKeys.assignment(userId ?? 'no-session', assignmentId),
    queryFn: ({ signal }) => ratingsApi.assignment(assignmentId, signal),
    enabled: enabled && Boolean(assignmentId) && Boolean(userId),
    retry: false,
  });
  const data = query.data;
  if (!data) return NOTHING;
  const mine = data.mine;
  if (mine) {
    const stillEditable = mine.editable && !mine.revealed && (mine.editableUntil === null || Date.parse(mine.editableUntil) > now);
    return stillEditable
      ? { label: 'Edit your rating', note: 'You rated this errand. You can still change your rating.' }
      : { label: 'View your rating', note: 'You rated this errand.' };
  }
  if (data.canRate) return { label: 'Rate this errand', note: 'This errand is complete. Rate it, or review the timeline for the recorded steps.' };
  return { label: null, note: 'This errand is complete. The rating window has closed.' };
}
