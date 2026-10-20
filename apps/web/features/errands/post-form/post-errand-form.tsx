'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { PageHead } from '@/components/shell/page-head';
import { ArrowLeft } from 'lucide-react';
import { clearErrandDraft, readErrandDraft } from '@/lib/drafts/errand-draft';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { LOCAL_PHONE_ERROR, e164ToLocalPhone, isLocalPhone, localPhoneToE164 } from '@urgent/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/lib/query/mutations';
import type { components } from '@urgent/api-client';
import { Alert, Button, Input, MoneyInput, Skeleton, Textarea } from '@urgent/ui';
import { MediaUpload } from '@/components/media/MediaUpload';
import { LagosDateTimeField } from '@/components/forms/lagos-date-time-field';
import type { PinValue } from '@/components/map/PinPicker';
import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { Category, ParticipantLocation } from '@/lib/api/types';
import { useCategories, requiredLocations } from '@/features/reference/hooks';
import { errandsApi, type Errand, type UpdateErrand } from '../api';
import { isScheduledTimeInRange, SCHEDULE_MAX_DAYS_AHEAD, SCHEDULE_MIN_LEAD_HOURS } from '../schemas';

const LocationPicker = dynamic(
  () => import('@/components/map/LocationPicker').then((module) => module.LocationPicker),
  { ssr: false, loading: () => <Skeleton className="h-64 rounded-[var(--r)]" aria-label="Loading map tools" /> },
);

type TimeMode = components['schemas']['TimeMode'];
type ItemSize = components['schemas']['ItemSize'];

interface ErrandForm {
  title: string;
  categoryId: string;
  description: string;
  instructions: string;
  timeMode: TimeMode | '';
  scheduledAt: string | null;
  suggestedBudgetMinor: number | null;
  itemSize: ItemSize | '';
  itemValueMinor: number | null;
  pickup: PinValue | null;
  destination: PinValue | null;
  pickupContact: { name: string; phone: string };
  dropoffContact: { name: string; phone: string };
  photoMediaIds: string[];
}

const emptyForm = (): ErrandForm => ({
  title: '',
  categoryId: '',
  description: '',
  instructions: '',
  timeMode: '',
  scheduledAt: null,
  suggestedBudgetMinor: null,
  itemSize: '',
  itemValueMinor: null,
  pickup: null,
  destination: null,
  pickupContact: { name: '', phone: '' },
  dropoffContact: { name: '', phone: '' },
  photoMediaIds: [],
});

/**
 * Values handed over by the landing-page request form or the dashboard's Quick post. The draft
 * is read once and cleared. Free-text areas cannot become exact pins, so they go into the
 * instructions for the person to turn into locations on this form.
 */
function formFromDraft(): ErrandForm {
  const form = emptyForm();
  const draft = readErrandDraft();
  if (!draft) return form;
  clearErrandDraft();
  form.title = draft.title.slice(0, 80);
  form.description = draft.description ?? '';
  if (Number.isFinite(draft.budgetNaira) && draft.budgetNaira >= 500) {
    form.suggestedBudgetMinor = Math.round(draft.budgetNaira * 100);
  }
  const places = [
    draft.pickup ? `Pickup area: ${draft.pickup}` : '',
    draft.destination ? `Drop-off area: ${draft.destination}` : '',
  ].filter(Boolean);
  form.instructions = places.join('\n');
  return form;
}

function locationInput(value: PinValue) {
  return {
    point: { lat: value.lat, lng: value.lng },
    source: value.source,
    ...(value.addressText ? { addressText: value.addressText } : {}),
    ...(value.landmark ? { landmark: value.landmark } : {}),
  };
}

function fromParticipantLocation(value: ParticipantLocation | null): PinValue | null {
  return value ? {
    lat: value.exact.lat,
    lng: value.exact.lng,
    source: 'MANUAL',
    ...(value.addressText ? { addressText: value.addressText } : {}),
    ...(value.landmark ? { landmark: value.landmark } : {}),
  } : null;
}

function fromErrand(errand: Errand): ErrandForm {
  return {
    title: errand.title,
    categoryId: errand.category.id,
    description: errand.description,
    instructions: errand.instructions ?? '',
    timeMode: errand.timeMode ?? '',
    scheduledAt: errand.scheduledAt,
    suggestedBudgetMinor: errand.suggestedBudgetMinor,
    itemSize: errand.itemSize ?? '',
    itemValueMinor: errand.itemValueMinor,
    pickup: fromParticipantLocation(errand.pickup),
    destination: fromParticipantLocation(errand.destination),
    pickupContact: { name: errand.pickupContact?.name ?? '', phone: e164ToLocalPhone(errand.pickupContact?.phone ?? '') },
    dropoffContact: { name: errand.dropoffContact?.name ?? '', phone: e164ToLocalPhone(errand.dropoffContact?.phone ?? '') },
    photoMediaIds: errand.photos.map((photo) => photo.mediaId),
  };
}

/** A phone that is not in the local format yet is left out of the draft; the form blocks review until it is fixed. */
function contactInput(value: ErrandForm['pickupContact']) {
  const phone = localPhoneToE164(value.phone) ?? undefined;
  return value.name.trim() || phone
    ? { name: value.name.trim() || undefined, phone }
    : null;
}

const contactPhoneInvalid = (value: ErrandForm['pickupContact']) => value.phone.trim() !== '' && !isLocalPhone(value.phone);

function sameLocation(left: PinValue | null, right: PinValue | null): boolean {
  if (left === null || right === null) return left === right;
  return left.lat === right.lat
    && left.lng === right.lng
    && left.addressText === right.addressText
    && left.landmark === right.landmark;
}

function hasMaterialChanges(current: ErrandForm, baseline: ErrandForm): boolean {
  return current.categoryId !== baseline.categoryId
    || current.timeMode !== baseline.timeMode
    || current.scheduledAt !== baseline.scheduledAt
    || current.itemSize !== baseline.itemSize
    || current.itemValueMinor !== baseline.itemValueMinor
    || !sameLocation(current.pickup, baseline.pickup)
    || !sameLocation(current.destination, baseline.destination);
}

function diffForm(current: ErrandForm, baseline: ErrandForm, expectedVersion: number): UpdateErrand {
  const patch: UpdateErrand = { expectedVersion };
  if (current.title !== baseline.title) patch.title = current.title;
  if (current.categoryId !== baseline.categoryId) patch.categoryId = current.categoryId;
  if (current.description !== baseline.description) patch.description = current.description;
  if (current.instructions !== baseline.instructions) patch.instructions = current.instructions;
  if (current.timeMode !== baseline.timeMode && current.timeMode) patch.timeMode = current.timeMode;
  if (current.scheduledAt !== baseline.scheduledAt) patch.scheduledAt = current.scheduledAt;
  if (current.suggestedBudgetMinor !== baseline.suggestedBudgetMinor) patch.suggestedBudgetMinor = current.suggestedBudgetMinor;
  if (current.itemSize !== baseline.itemSize) patch.itemSize = current.itemSize || null;
  if (current.itemValueMinor !== baseline.itemValueMinor) patch.itemValueMinor = current.itemValueMinor;
  if (!sameLocation(current.pickup, baseline.pickup)) patch.pickup = current.pickup ? locationInput(current.pickup) : null;
  if (!sameLocation(current.destination, baseline.destination)) patch.destination = current.destination ? locationInput(current.destination) : null;
  if (JSON.stringify(current.pickupContact) !== JSON.stringify(baseline.pickupContact)) patch.pickupContact = contactInput(current.pickupContact);
  if (JSON.stringify(current.dropoffContact) !== JSON.stringify(baseline.dropoffContact)) patch.dropoffContact = contactInput(current.dropoffContact);
  if (JSON.stringify(current.photoMediaIds) !== JSON.stringify(baseline.photoMediaIds)) patch.photoMediaIds = current.photoMediaIds;
  return patch;
}

function isEmptyPatch(patch: UpdateErrand): boolean {
  return Object.keys(patch).length === 1;
}

function fieldError(error: unknown): string {
  if (!isApiError(error)) return 'We could not save the draft. Please try again.';
  if (error.code === 'ERRAND_INVALID_STATE') {
    const status = error.details.from ?? error.details.status;
    if (typeof status === 'string' && !['DRAFT', 'OPEN'].includes(status)) {
      return 'This errand can no longer be edited because a runner has been selected or its status has changed. View errand details for the next available action.';
    }
    return 'This errand changed elsewhere. Reload it to get the latest version.';
  }
  if (error.code === 'ERRAND_NOT_ELIGIBLE') {
    const reason = error.details.reason;
    if (reason === 'DRAFT_LIMIT') {
      const limit = error.details.limit;
      return `You have reached the draft limit${typeof limit === 'number' ? ` of ${limit}` : ''}. Publish or delete a draft before creating another.`;
    }
    if (reason === 'PROHIBITED_ITEM') {
      const keywords = Array.isArray(error.details.keywords) ? error.details.keywords.filter((item): item is string => typeof item === 'string') : [];
      return keywords.length ? `Remove prohibited item references: ${keywords.join(', ')}.` : 'Remove prohibited items from the errand details.';
    }
    if (reason === 'INCOMPLETE') {
      const problems = Array.isArray(error.details.problems) ? error.details.problems : [];
      const fields = problems
        .map((problem) => problem && typeof problem === 'object' && 'field' in problem && typeof problem.field === 'string' ? problem.field : null)
        .filter((field): field is string => field !== null);
      return fields.length ? `Complete these fields before posting: ${fields.join(', ')}.` : error.message;
    }
  }
  if (error.code === 'SCHEDULE_OUT_OF_RANGE') return 'Choose a time at least one hour from now and within the next seven days.';
  if (error.code === 'FEATURE_DISABLED') return 'Posting is temporarily paused. Please try again later.';
  if (error.code === 'FORBIDDEN' && error.details.restriction) return 'Your account is temporarily restricted from creating errands.';
  if (error.code === 'VALIDATION_ERROR' && typeof error.details.field === 'string') {
    return `${error.details.field}: ${error.message}`;
  }
  return error.message;
}

function locationErrorMessage(error: unknown): string | null {
  if (isApiError(error) && error.code === 'SCHEDULE_OUT_OF_RANGE') {
    return 'Scheduled times must be at least one hour from now and no more than seven days ahead.';
  }
  return null;
}

export function PostErrandForm({ errandId }: { errandId?: string }) {
  const categories = useCategories();
  const existing = useQuery({
    queryKey: queryKeys.errands.detail(errandId ?? ''),
    queryFn: () => {
      if (!errandId) throw new Error('An errand ID is required to load an existing errand.');
      return errandsApi.get(errandId);
    },
    enabled: Boolean(errandId),
  });

  if (categories.isLoading || (errandId && existing.isLoading)) {
    return <PageLoading title="Post an errand" eyebrow="Requester" />;
  }
  if (errandId && existing.error) {
    return <Alert variant="danger" role="alert"><div className="grid gap-2"><p>{fieldError(existing.error)}</p><div className="flex flex-wrap gap-3"><Button type="button" variant="ghost" onClick={() => void existing.refetch()}>Try again</Button><Link href="/errands" className="inline-flex items-center font-bold underline">Back to my errands</Link></div></div></Alert>;
  }
  if (categories.error) {
    return <Alert variant="danger" role="alert"><div className="grid gap-2"><p>We could not load errand categories.</p><Button type="button" variant="ghost" onClick={() => void categories.refetch()}>Try again</Button></div></Alert>;
  }

  return (
    <ErrandFormEditor
      key={errandId ?? 'new'}
      errandId={errandId}
      initialErrand={existing.data}
      categories={categories.data ?? []}
    />
  );
}

function ErrandFormEditor({ errandId, initialErrand, categories }: {
  errandId?: string;
  initialErrand?: Errand;
  categories: Category[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ErrandForm>(() => initialErrand ? fromErrand(initialErrand) : formFromDraft());
  const [baseline, setBaseline] = useState<ErrandForm | null>(() => initialErrand ? fromErrand(initialErrand) : null);
  const [version, setVersion] = useState(initialErrand?.version ?? 0);
  const [validationError, setValidationError] = useState('');
  const failedPatch = useRef<string | null>(null);
  const create = useApiMutation({
    mutationFn: () => errandsApi.create({ title: form.title.trim(), categoryId: form.categoryId }),
    // A new draft appears in My errands and its counts.
    affects: ['errands'],
    onSuccess: (errand) => {
      router.replace(`/errands/${errand.id}/edit`);
      router.refresh();
    },
  });
  const save = useApiMutation({
    mutationFn: (patch: UpdateErrand) => errandsApi.update(errandId!, patch),
    // Only pages that are open refetch, and this page shows few; the rest are marked stale.
    affects: ['errands'],
    onSuccess: (errand) => {
      failedPatch.current = null;
      setBaseline(fromErrand(errand));
      setVersion(errand.version);
    },
    onError: (_error, patch) => {
      failedPatch.current = JSON.stringify(patch);
    },
  });
  const saveDraft = save.mutate;
  const isSaving = save.isPending;

  useEffect(() => {
    if (!errandId || !baseline) return;
    if (form.timeMode === 'SCHEDULED' && !isScheduledTimeInRange(form.scheduledAt)) return;
    const patch = diffForm(form, baseline, version);
    if (isEmptyPatch(patch)) return;
    // A failed save is not retried on its own; the person edits again or chooses "Try again".
    if (failedPatch.current === JSON.stringify(patch)) return;
    const timer = window.setTimeout(() => {
      if (!isSaving) saveDraft(patch);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [baseline, errandId, form, isSaving, saveDraft, version]);

  const selectedCategory = categories.find((category) => category.id === form.categoryId);
  const locations = selectedCategory ? requiredLocations(selectedCategory) : null;
  const dateInvalid = form.timeMode === 'SCHEDULED' && !isScheduledTimeInRange(form.scheduledAt);
  const phoneInvalid = contactPhoneInvalid(form.pickupContact) || contactPhoneInvalid(form.dropoffContact);
  const currentPatch = baseline ? diffForm(form, baseline, version) : null;
  const hasUnsavedChanges = currentPatch ? !isEmptyPatch(currentPatch) : false;
  const warnsAboutOffers = initialErrand?.status === 'OPEN' && Boolean(baseline && hasMaterialChanges(form, baseline));
  const saveError = create.error ?? save.error;
  const saveMessage = saveError ? fieldError(saveError) : '';
  const savedMessage = save.isPending ? 'Saving draft…' : hasUnsavedChanges ? 'Unsaved changes are being saved…' : save.isSuccess ? 'Draft saved' : '';

  const update = <K extends keyof ErrandForm>(key: K, value: ErrandForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationError('');
  };
  const updateCategory = (categoryId: string) => {
    const selected = categories.find((category) => category.id === categoryId);
    const requirements = selected ? requiredLocations(selected) : null;
    setForm((current) => ({
      ...current,
      categoryId,
      ...(requirements?.pickup ? {} : { pickup: null }),
      ...(requirements?.destination ? {} : { destination: null }),
    }));
    setValidationError('');
  };

  const startDraft = () => {
    if (!form.title.trim() || !form.categoryId) {
      setValidationError('Enter a title and choose a category to start your draft.');
      return;
    }
    create.mutate();
  };
  const retrySave = () => {
    if (!errandId) {
      create.mutate();
      return;
    }
    if (!baseline || dateInvalid) return;
    const patch = diffForm(form, baseline, version);
    failedPatch.current = null;
    if (!isEmptyPatch(patch)) save.mutate(patch);
  };

  if (initialErrand && !['DRAFT', 'OPEN'].includes(initialErrand.status)) {
    return (
      <div className="grid min-w-0 content-start gap-4 pb-10">
        <Alert variant="warn" role="status">This errand can no longer be edited because a runner has been selected or its status has changed.</Alert>
        <Link href={errandId ? `/errands/${errandId}` : '/errands'} className="font-bold text-green-800 underline">Return to errand details</Link>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <Link href={errandId ? `/errands/${errandId}` : '/errands'} className="inline-flex w-fit items-center gap-2 text-xs font-bold text-green-900 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />{errandId ? 'Back to errand' : 'My errands'}</Link>
      <PageHead
        eyebrow="Requester"
        title={errandId ? 'Edit errand' : 'Post an errand'}
        description="Share the essentials. You review runner offers before agreeing a price."
      />
      {saveMessage ? <Alert variant="danger" role="alert"><div className="grid gap-2"><p>{saveMessage}</p><Button type="button" variant="ghost" onClick={retrySave} disabled={create.isPending || save.isPending || dateInvalid}>Try again</Button></div></Alert> : null}
      {validationError ? <Alert variant="danger" role="alert">{validationError}</Alert> : null}
      {warnsAboutOffers ? <Alert variant="warn" role="status">Changing the category, timing, size, value or location asks existing runners to reconfirm their offers before you can select one.</Alert> : null}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <form className="grid min-w-0 gap-5 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]" onSubmit={(event) => { event.preventDefault(); if (!errandId) startDraft(); }}>
          <div className="border-b border-line pb-3">
            <h2 className="font-extrabold text-ink">Errand details</h2>
            <p className="mt-1 text-xs text-muted">{errandId ? 'Changes save automatically as you go.' : 'Start a draft with a title and category, then add the details.'}</p>
          </div>
          <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="errand-title">What do you need done?
            <Input id="errand-title" maxLength={120} required value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Pick up groceries from Justrite" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="errand-category">Category
            <select id="errand-category" required value={form.categoryId} onChange={(event) => updateCategory(event.target.value)} className="min-h-11 rounded-[var(--r)] border border-line bg-surface px-3 text-sm">
              <option value="">Choose a category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          {errandId ? (
            <>
              <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="errand-description">Describe the task
                <Textarea id="errand-description" maxLength={2000} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Name the item and the exact task." />
              </label>
              <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="errand-instructions">Instructions for the runner <span className="font-normal text-muted">Optional</span>
                <Textarea id="errand-instructions" maxLength={1000} value={form.instructions} onChange={(event) => update('instructions', event.target.value)} placeholder="Mention size, weight, fragile items or anything else to know." />
              </label>
              <fieldset id="errand-time-mode" className="grid gap-2">
                <legend className="text-sm font-bold text-ink">When?</legend>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={form.timeMode === 'ASAP' ? 'primary' : 'soft'} onClick={() => { update('timeMode', 'ASAP'); update('scheduledAt', null); }}>As soon as possible</Button>
                  <Button type="button" variant={form.timeMode === 'SCHEDULED' ? 'primary' : 'soft'} onClick={() => update('timeMode', 'SCHEDULED')}>Schedule for later</Button>
                </div>
              </fieldset>
              {form.timeMode === 'SCHEDULED' ? (
                <LagosDateTimeField
                  id="errand-schedule"
                  label="Scheduled time"
                  value={form.scheduledAt}
                  onChange={(value) => update('scheduledAt', value)}
                  hint="Choose a time at least one hour from now and within the next seven days."
                  required
                  minLeadMinutes={SCHEDULE_MIN_LEAD_HOURS * 60}
                  maxDaysAhead={SCHEDULE_MAX_DAYS_AHEAD}
                  error={dateInvalid && form.scheduledAt !== null ? 'This time is outside the allowed scheduling window.' : locationErrorMessage(saveError) ?? undefined}
                />
              ) : null}
              {locations?.pickup ? <div id="errand-pickup"><LocationPicker label="Pickup location" value={form.pickup} onChange={(value) => update('pickup', value)} /></div> : null}
              {locations?.destination ? <div id="errand-destination"><LocationPicker label="Drop-off location" value={form.destination} onChange={(value) => update('destination', value)} /></div> : null}
              {locations?.onSite ? <div id="errand-pickup" className="grid gap-2"><p className="text-sm text-muted">This is an on-site task. Add the area where the work will happen.</p><LocationPicker label="On-site location" value={form.pickup} onChange={(value) => update('pickup', value)} /></div> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="errand-size">Item size <span className="font-normal text-muted">Optional</span>
                  <select id="errand-size" value={form.itemSize} onChange={(event) => update('itemSize', event.target.value as ItemSize | '')} className="min-h-11 rounded-[var(--r)] border border-line bg-surface px-3 text-sm">
                    <option value="">Not specified</option><option value="SMALL">Small (fits a bag)</option><option value="MEDIUM">Medium (a box)</option><option value="LARGE">Large (needs a car)</option><option value="EXTRA_LARGE">Extra large</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="errand-value">Item value <span className="font-normal text-muted">Optional</span>
                  <MoneyInput id="errand-value" value={form.itemValueMinor} onChange={(value) => update('itemValueMinor', value)} placeholder="20,000" />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold text-ink" htmlFor="errand-budget">Suggested budget <span className="font-normal text-muted">Optional · guidance, not a commitment</span>
                <MoneyInput id="errand-budget" value={form.suggestedBudgetMinor} onChange={(value) => update('suggestedBudgetMinor', value)} placeholder="5,000" />
              </label>
              <div className="grid gap-2">
                <h3 className="text-sm font-bold text-ink">Photos <span className="font-normal text-muted">Up to 5 · no IDs or payment cards</span></h3>
                <MediaUpload purpose="ERRAND_PHOTO" value={form.photoMediaIds} maxFiles={5} onChange={(ids) => update('photoMediaIds', ids)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ContactFields label="Pickup contact" value={form.pickupContact} onChange={(value) => update('pickupContact', value)} />
                <ContactFields label="Drop-off contact" value={form.dropoffContact} onChange={(value) => update('dropoffContact', value)} />
              </div>
              <p className="rounded-[var(--r)] border border-line bg-panel p-3 text-sm text-muted">Exact addresses and contacts are shared only with the runner you select, after they accept. Payment is made directly to the runner; Urgent.ng does not handle it.</p>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <span className="text-xs text-muted" role="status">{savedMessage || 'Draft autosaves after you pause.'}</span>
                {dateInvalid || phoneInvalid || save.isPending || hasUnsavedChanges
                  ? <Button type="button" disabled>{dateInvalid ? 'Fix scheduled time to review' : phoneInvalid ? 'Fix contact phone to review' : 'Save changes to review'}</Button>
                  : <Link href={`/errands/${errandId}/review`} className="inline-flex min-h-11 items-center justify-center rounded-[var(--r)] bg-green-800 px-4 text-sm font-bold text-white hover:bg-green-900">Review and post</Link>}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="ghost" onClick={() => router.push('/errands')}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Starting draft…' : 'Continue to details'}</Button>
            </div>
          )}
        </form>
        <aside className="grid content-start gap-4 lg:sticky lg:top-6">
          <section className="rounded-[var(--r-lg)] bg-tint p-4 sm:p-[22px]">
            <h2 className="font-extrabold text-ink">Tips for faster offers</h2>
            <ul className="mt-3 grid gap-2 pl-5 text-sm text-ink-2"><li>Name the item and exact task.</li><li>Add a photo if it helps.</li><li>Set a fair budget; offers may differ.</li><li>Keep chat inside Urgent.ng.</li></ul>
          </section>
          <section className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <h2 className="font-extrabold text-ink">What runners see</h2>
            <p className="mt-2 text-sm text-muted">Title, approximate area, distance and budget. Exact addresses and contacts are shown only to the runner you select, after acceptance.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ContactFields({ label, value, onChange }: {
  label: string;
  value: ErrandForm['pickupContact'];
  onChange: (value: ErrandForm['pickupContact']) => void;
}) {
  const prefix = label.startsWith('Pickup') ? 'pickup' : 'dropoff';
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-bold text-ink">{label} <span className="font-normal text-muted">Optional</span></legend>
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor={`${prefix}-contact-name`}>Name
        <Input id={`${prefix}-contact-name`} maxLength={100} value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor={`${prefix}-contact-phone`}>Phone
        <Input id={`${prefix}-contact-phone`} type="tel" inputMode="tel" maxLength={11} value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} placeholder="08031234567" aria-invalid={contactPhoneInvalid(value)} aria-describedby={contactPhoneInvalid(value) ? `${prefix}-contact-phone-error` : undefined} />
      </label>
      {contactPhoneInvalid(value) && <p id={`${prefix}-contact-phone-error`} role="alert" className="text-xs text-red">{LOCAL_PHONE_ERROR}</p>}
    </fieldset>
  );
}
