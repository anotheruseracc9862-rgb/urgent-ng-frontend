'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import { ArrowLeft } from 'lucide-react';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { errandsApi, type Errand } from '../api';
import { CONFIRM_COPY, PLACE_COPY, flowOf } from '@/features/reference/flow';
import { InfoDisclosure, InfoNote } from '@/components/shared/info-disclosure';
import { markErrandJustPosted } from '../detail/errand-posted-banner';

const money = (minor: number | null) =>
  minor === null ? 'Not set' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);

function scheduledTime(value: string | null) {
  if (!value) return 'Not selected';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));
}

function area(location: Errand['pickup']) {
  if (!location) return 'Not added';
  return [...new Set([location.area, location.lga, location.state].filter(Boolean))].join(', ');
}

const FIELD_TARGETS: Record<string, { label: string; anchor: string }> = {
  title: { label: 'Title', anchor: 'errand-title' },
  categoryId: { label: 'Category', anchor: 'errand-category' },
  description: { label: 'Description', anchor: 'errand-description' },
  timeMode: { label: 'When', anchor: 'errand-time-mode' },
  scheduledAt: { label: 'Scheduled time', anchor: 'errand-schedule' },
  pickup: { label: 'Pickup location', anchor: 'errand-pickup' },
  destination: { label: 'Drop-off location', anchor: 'errand-destination' },
  instructions: { label: 'Instructions', anchor: 'errand-instructions' },
  suggestedBudgetMinor: { label: 'Suggested budget', anchor: 'errand-budget' },
  itemSize: { label: 'Item size', anchor: 'errand-size' },
  itemValueMinor: { label: 'Item value', anchor: 'errand-value' },
  pickupContact: { label: 'Pickup contact', anchor: 'pickup-contact-name' },
  dropoffContact: { label: 'Drop-off contact', anchor: 'dropoff-contact-name' },
};

function publishError(error: unknown): string {
  if (!isApiError(error)) return 'We could not post this errand. Please try again.';
  if (error.code === 'ERRAND_NOT_ELIGIBLE') {
    const reason = error.details.reason;
    if (reason === 'OPEN_ERRAND_LIMIT') {
      const limit = error.details.limit;
      return `You have reached the open-errand limit${typeof limit === 'number' ? ` of ${limit}` : ''}. Close an open errand before posting another.`;
    }
    if (reason === 'DRAFT_LIMIT') {
      const limit = error.details.limit;
      return `You have reached the draft limit${typeof limit === 'number' ? ` of ${limit}` : ''}. Delete an unused draft before posting.`;
    }
    if (reason === 'ACCOUNT_NOT_VERIFIED') return 'Verify your runner account before posting this errand.';
    if (reason === 'PROHIBITED_ITEM') {
      const keywords = Array.isArray(error.details.keywords) ? error.details.keywords.filter((item): item is string => typeof item === 'string') : [];
      return keywords.length ? `Remove prohibited item references: ${keywords.join(', ')}.` : 'Remove prohibited items from the errand details.';
    }
    if (reason === 'INCOMPLETE') return 'Complete the fields listed below before posting.';
  }
  if (error.code === 'SCHEDULE_OUT_OF_RANGE') return 'The scheduled time must be at least one hour from now and within the next seven days.';
  if (error.code === 'FEATURE_DISABLED') return 'Posting is temporarily paused. Please try again later.';
  if (error.code === 'FORBIDDEN' && error.details.restriction) return 'Your account is temporarily restricted from posting errands.';
  if (error.code === 'IDEMPOTENCY_CONFLICT') return 'The publish request key was already used for a different request. Generate a new key and retry.';
  return error.message;
}

export function ErrandReviewPage({ errandId }: { errandId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const errand = useQuery({
    queryKey: queryKeys.errands.detail(errandId),
    queryFn: () => errandsApi.get(errandId),
  });
  const publish = useApiMutation({ affects: ['errands'],
    mutationFn: (key: string) => errandsApi.publish(errandId, { prohibitedItemsConfirmed: true }, key),
    onSuccess: (publishedErrand) => {
      queryClient.setQueryData(queryKeys.errands.detail(errandId), publishedErrand);
      // Straight to the errand, where offers will arrive, with a one-time confirmation on it.
      markErrandJustPosted(errandId);
      router.replace(`/errands/${errandId}`);
      router.refresh();
    },
  });

  if (errand.isPending) {
    return <PageLoading title="Review your errand" eyebrow="Post an errand · Step 2 of 2" />;
  }
  if (errand.error || !errand.data) {
    return (
      <div className="grid min-w-0 content-start gap-4 pb-10">
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>{errand.error ? 'We could not load this errand for review.' : 'This errand could not be found.'}</p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={() => void errand.refetch()}>Try again</Button>
              <Link href={`/errands/${errandId}/edit`} className="inline-flex items-center font-bold underline">Back to edit</Link>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  const currentErrand = errand.data;
  const flow = flowOf(currentErrand.category);
  const service = flow === 'SERVICE';
  const problems = isApiError(publish.error) && publish.error.code === 'ERRAND_NOT_ELIGIBLE' && Array.isArray(publish.error.details.problems)
    ? publish.error.details.problems
    : [];
  const retry = () => {
    if (isApiError(publish.error) && publish.error.code === 'IDEMPOTENCY_CONFLICT') {
      const nextKey = crypto.randomUUID();
      setIdempotencyKey(nextKey);
      publish.mutate(nextKey);
      return;
    }
    publish.mutate(idempotencyKey);
  };

  return (
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={`/errands/${errandId}/edit`} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline max-sm:hidden"><ArrowLeft aria-hidden="true" className="size-4" />Back to edit</Link>
      <PageHead
        eyebrow="Post an errand · Step 2 of 2"
        title="Review your errand"
        description="Check what runners will see. Exact addresses stay hidden until a runner accepts."
      />
      {currentErrand.status !== 'DRAFT' ? (
        <Alert variant="info" role="status">
          <div className="grid gap-2">
            <p>This errand is already posted or no longer a draft.</p>
            <Link href={`/errands/${errandId}`} className="font-bold underline">View errand</Link>
          </div>
        </Alert>
      ) : null}
      {publish.error ? (
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>{publishError(publish.error)}</p>
            {problems.length ? (
              <ul className="grid gap-1">
                {problems.map((problem, index) => {
                  const field = problem && typeof problem === 'object' && 'field' in problem && typeof problem.field === 'string' ? problem.field : null;
                  if (!field) return <li key={index}>Check the errand details.</li>;
                  const target = FIELD_TARGETS[field];
                  return <li key={`${field}-${index}`}><Link className="font-bold underline" href={`/errands/${errandId}/edit#${target?.anchor ?? 'errand-title'}`}>{field === 'destination' && service ? PLACE_COPY.SERVICE.destination : target?.label ?? field}</Link> needs attention.</li>;
                })}
              </ul>
            ) : null}
            {isApiError(publish.error) && publish.error.code === 'SCHEDULE_OUT_OF_RANGE' ? (
              <Link className="font-bold underline" href={`/errands/${errandId}/edit#errand-schedule`}>Change the scheduled time</Link>
            ) : null}
            {isApiError(publish.error) && publish.error.code === 'ERRAND_NOT_ELIGIBLE' && publish.error.details.reason === 'OPEN_ERRAND_LIMIT' ? (
              <Link className="font-bold underline" href="/errands?tab=OPEN">Review your open errands</Link>
            ) : null}
            {isApiError(publish.error) && publish.error.code === 'ERRAND_NOT_ELIGIBLE' && publish.error.details.reason === 'DRAFT_LIMIT' ? (
              <Link className="font-bold underline" href="/errands?tab=DRAFT">Manage your drafts</Link>
            ) : null}
            <Button type="button" variant="ghost" onClick={retry} disabled={publish.isPending}>Try again</Button>
          </div>
        </Alert>
      ) : null}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-4">
          <section className="grid min-w-0 gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-ink">{currentErrand.title}</h2>
                <p className="mt-1 text-sm text-muted">{currentErrand.category.name}{currentErrand.itemSize ? ` · ${currentErrand.itemSize.toLowerCase().replace('_', ' ')}` : ''}</p>
              </div>
              <Link href={`/errands/${errandId}/edit`} className="text-sm font-bold text-green-800 underline">Edit</Link>
            </div>
            {currentErrand.description ? <p className="text-sm text-ink-2">{currentErrand.description}</p> : <p className="text-sm text-amber">Add a description before posting.</p>}
            {currentErrand.instructions ? <p className="rounded-[var(--r)] bg-panel p-3 text-sm text-ink-2">{currentErrand.instructions}</p> : null}
            <dl className="grid gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
              {service ? null : <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Pickup area</dt><dd className="mt-1 text-sm font-semibold text-ink">{area(currentErrand.pickup)}</dd></div>}
              <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">{PLACE_COPY[flow].destinationArea}</dt><dd className="mt-1 text-sm font-semibold text-ink">{area(currentErrand.destination)}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">When</dt><dd className="mt-1 text-sm font-semibold text-ink">{currentErrand.timeMode === 'ASAP' ? 'As soon as possible' : currentErrand.timeMode === 'SCHEDULED' ? scheduledTime(currentErrand.scheduledAt) : 'Not selected'}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Suggested budget</dt><dd className="mt-1 text-sm font-semibold text-ink">{money(currentErrand.suggestedBudgetMinor)}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Photos</dt><dd className="mt-1 text-sm font-semibold text-ink">{currentErrand.photos.length} attached</dd></div>
            </dl>
          </section>
          <InfoNote><strong className="text-ink">Payment is made directly to the runner.</strong> Urgent.ng does not handle the errand payment. Agree the amount before work starts.</InfoNote>
        </div>
        <aside className="grid min-w-0 content-start gap-4 lg:sticky lg:top-6">
          <InfoDisclosure title="What runners see and what stays private" className="order-2 lg:order-1">
          <section className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <h2 className="font-extrabold text-ink">Runners see now</h2>
            <ul className="mt-3 grid gap-2 text-sm text-ink-2"><li>Title, category and approximate areas</li><li>{service ? 'Timing and suggested budget' : 'Timing, item size and suggested budget'}</li><li>Photos you attached</li></ul>
          </section>
          <section className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <h2 className="font-extrabold text-ink">Shared after acceptance</h2>
            <ul className="mt-3 grid gap-2 text-sm text-ink-2"><li>{service ? 'Exact address and landmark' : 'Exact addresses and landmarks'}</li><li>{service ? 'Contact at the address' : 'Pickup and drop-off contacts'}</li><li>Your phone number</li></ul>
          </section>
          </InfoDisclosure>
          <div className="order-1 grid gap-4 lg:order-2">
          <label className="flex items-start gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-4 text-sm font-semibold text-ink sm:p-[22px]">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-green-800"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>{CONFIRM_COPY[flow]}</span>
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={`/errands/${errandId}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-bold text-ink hover:bg-panel">Back to edit</Link>
            <Button
              type="button"
              disabled={!confirmed || currentErrand.status !== 'DRAFT' || publish.isPending || publish.isSuccess}
              onClick={() => publish.mutate(idempotencyKey)}
            >
              {publish.isPending ? 'Posting…' : 'Post errand'}
            </Button>
          </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
