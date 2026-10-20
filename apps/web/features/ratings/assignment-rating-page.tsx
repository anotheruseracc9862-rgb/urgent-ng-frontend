'use client';

import { useLivePolling } from '@/features/realtime/use-live-polling';
import { useApiMutation } from '@/lib/query/mutations';
import { PageHead } from '@/components/shell/page-head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';
import { offersApi } from '@/features/offers/api';
import { ratingKeys, ratingsApi, type Rating, type Scores, type SubmitRating } from './api';
import { dimensions, panel, RatingContent, RatingError, RatingsLoading, reasonText, ReportRating, StarInput } from './rating-ui';
import { JourneyHere } from '@/features/journey/journey-context';

function beforeDeadline(deadline: string | null, now: number) {
  return deadline === null || Date.parse(deadline) > now;
}

export function AssignmentRatingPage({ assignmentId }: { assignmentId: string }) {
  const polling = useLivePolling(30_000);
  const { me } = useSession();
  const router = useRouter();
  const client = useQueryClient();
  const key = ratingKeys.assignment(me.id, assignmentId);
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => ratingsApi.assignment(assignmentId, signal), retry: false, refetchInterval: polling });
  // Shared with the assignment page, so this is usually already cached. It only decides where to go after saving.
  const assignment = useQuery({ queryKey: queryKeys.assignments.detail(assignmentId), queryFn: () => offersApi.assignment(assignmentId), retry: false });
  const [now, setNow] = useState(() => Date.now());
  const [saveError, setSaveError] = useState<unknown>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  if (query.isPending) return <div className="min-w-0"><RatingsLoading /></div>;
  if (!query.data || query.error) return <div className="min-w-0"><RatingError error={query.error} retry={() => void query.refetch()} /></div>;
  const data = query.data;
  const mine = data.mine;
  const editable = mine ? mine.editable && !mine.revealed && beforeDeadline(mine.editableUntil, now) : data.canRate && beforeDeadline(data.windowEndsAt, now);
  // Never trust the presence of counterpart content as proof of a blind reveal.
  const theirs = data.theirs?.revealed === true && mine?.revealed !== false ? data.theirs : null;
  const refresh = async (saved?: Rating) => {
    if (saved) {
      setSaveError(null);
      client.setQueryData(key, { ...data, mine: saved, canRate: false, reason: 'ALREADY_RATED' });
    }
    await client.invalidateQueries({ queryKey: ratingKeys.all(me.id) });
    // A saved rating ends the task: leave the page for the person's own list.
    if (saved) router.push(assignment.data?.data.role === 'RUNNER' ? '/assignments' : '/errands');
  };

  return <main className="grid min-w-0 content-start gap-4 pb-10">
    <Link href={`/assignments/${encodeURIComponent(assignmentId)}`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />Back to assignment</Link>
    <PageHead eyebrow="Rating" title="Rate your errand" description="Keep it fair and about the errand. Your review stays private until both sides rate or the rating window closes." />
    <JourneyHere />
    {saveError ? <RatingError error={saveError} /> : null}
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 content-start gap-4 lg:col-start-1 lg:row-start-1">
        <section className={`${panel} grid gap-4`} aria-label="Your rating">
          <h2 className="text-base font-extrabold text-ink">{mine ? 'Your rating' : 'How did it go?'}</h2>
          {mine ? <><RatingContent rating={mine} /><p className="text-xs text-muted">Status: {mine.status.replaceAll('_', ' ').toLowerCase()}</p></> : null}
          {editable ? <RatingForm key={`${assignmentId}:${mine?.id ?? 'new'}`} assignmentId={assignmentId} mine={mine} deadline={mine ? mine.editableUntil : data.windowEndsAt} onSaved={refresh} onError={setSaveError} />
            : <p className="text-sm text-muted">{reasonText(mine ? mine.revealed ? 'REVEALED' : mine.status !== 'PUBLISHED' ? 'MODERATED' : 'EDIT_WINDOW_CLOSED' : !beforeDeadline(data.windowEndsAt, now) ? 'WINDOW_CLOSED' : data.reason)}</p>}
        </section>
        {theirs ? <section className={`${panel} grid gap-4`} aria-label="Other side's rating"><h2 className="text-base font-extrabold text-ink">Other side’s rating</h2>
          {theirs.status === 'PUBLISHED' ? <RatingContent rating={theirs} /> : <p className="text-sm text-muted">This rating is {theirs.status.replaceAll('_', ' ').toLowerCase()}. Its content is not available.</p>}
          <ReportRating id={theirs.id} /></section> : null}
      </div>
      <aside aria-label="Reveal and window" className={`${panel} grid min-w-0 gap-3 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1`}>
        <h2 className="text-sm font-extrabold text-ink">Reveal and window</h2>
        <Alert variant="info" role="status">
          {mine?.revealed || theirs ? 'Ratings have been revealed.' : data.counterpartRated ? 'The other side has rated. Their rating stays hidden until the reveal.' : 'Waiting for the other side. Ratings stay hidden until both sides rate or the window closes.'}
          {data.windowEndsAt ? <p className="mt-1 text-xs">Rating window {beforeDeadline(data.windowEndsAt, now) ? 'closes' : 'closed'}: {formatDate(data.windowEndsAt)} (Lagos time). {Date.parse(data.windowEndsAt) - now > 0 && Date.parse(data.windowEndsAt) - now < 86_400_000 ? 'Window closing soon.' : null}</p> : null}
        </Alert>
        <Link href="/ratings" className="text-sm font-bold text-green-800 underline">View received and given ratings</Link>
      </aside>
    </div>
  </main>;
}

const optional = dimensions.filter(([key]) => key !== 'overall');

function RatingForm({ assignmentId, mine, deadline, onSaved, onError }: { assignmentId: string; mine: Rating | null; deadline: string | null; onSaved: (saved?: Rating) => Promise<unknown>; onError: (error: unknown) => void }) {
  const [scores, setScores] = useState<Scores>(() => Object.fromEntries(dimensions.flatMap(([key]) => mine?.scores[key] != null ? [[key, mine.scores[key]]] : [])));
  const [review, setReview] = useState(mine?.review ?? '');
  const [blocked, setBlocked] = useState(false);
  const intent = useRef<{ signature: string; key: string } | null>(null);
  const mutation = useApiMutation({ affects: ['assignments', 'users'],
    mutationFn: (body: SubmitRating) => {
      if (!beforeDeadline(deadline, Date.now())) throw new Error('The rating deadline has passed.');
      if (mine) return ratingsApi.edit(mine.id, { scores: body.scores, review: body.review || null });
      const signature = JSON.stringify(body);
      if (intent.current?.signature !== signature) intent.current = { signature, key: crypto.randomUUID() };
      return ratingsApi.submit(assignmentId, body, intent.current.key);
    },
    onSuccess: async (saved) => { await onSaved(saved); },
    onError: async (error) => {
      onError(error);
      if (isApiError(error) && ['RATING_NOT_ELIGIBLE', 'RATING_ALREADY_SUBMITTED'].includes(error.code)) {
        setBlocked(true);
        await onSaved();
      }
    },
  });
  const setScore = (key: keyof Scores, value: number | undefined) => {
    const next = { ...scores };
    if (value === undefined) delete next[key]; else next[key] = value;
    setScores(next);
  };
  return <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); if (!blocked && !mutation.isPending && scores.overall) mutation.mutate({ scores, review }); }}>
    {mutation.isSuccess ? <Alert variant="ok" role="status">Your rating was saved.</Alert> : null}
    <fieldset disabled={blocked || mutation.isPending} className="grid min-w-0 gap-5">
      <legend className="sr-only">{mine ? 'Edit your rating' : 'Submit a rating'}</legend>
      <div className="grid justify-items-center gap-2 rounded-[var(--r)] bg-tint p-4 text-center">
        <p className="text-sm font-bold text-ink">Overall <span className="font-normal text-muted">(required)</span></p>
        <StarInput label="Overall" value={scores.overall} onChange={(value) => setScore('overall', value)} large />
        <p className="text-xs text-muted" aria-live="polite">{scores.overall ? `${scores.overall} of 5` : 'Tap a star'}</p>
      </div>
      <div className="grid gap-1">
        <p className="text-sm font-bold text-ink">More detail <span className="font-normal text-muted">(optional){mine ? ': unrated ones keep their score' : ''}</span></p>
        <div className="grid gap-2 sm:grid-cols-2">
          {optional.map(([key, label]) => <div key={key} className="flex items-center justify-between gap-3 rounded-[var(--r-sm)] bg-panel px-3 py-2">
            <span className="text-sm font-semibold text-ink-2">{label}</span>
            <StarInput label={label} value={scores[key]} onChange={(value) => setScore(key, value)} clearable />
          </div>)}
        </div>
      </div>
      <label className="grid gap-2 text-sm font-bold text-ink">Your review (optional)
        <textarea maxLength={1000} rows={4} value={review} onChange={(event) => setReview(event.target.value)} placeholder="Keep it fair and about the errand." className="w-full rounded-xl border border-line bg-surface p-3 font-normal focus:outline-2 focus:outline-green-700" />
        <span className="text-xs font-normal text-muted">{review.length}/1000 characters. Reviews may be checked for safety and policy.</span>
      </label>
      {deadline ? <p className="text-xs text-muted">{mine ? 'Editable' : 'Submit'} until {formatDate(deadline)} (Lagos time).</p> : null}
      <Button type="submit" className="w-fit" disabled={!scores.overall || blocked || mutation.isPending}>{mutation.isPending ? 'Saving…' : mine ? 'Save changes' : 'Submit rating'}</Button>
    </fieldset>
  </form>;
}
