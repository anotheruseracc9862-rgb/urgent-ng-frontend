'use client';

import { PageLoading } from '@/components/shell/page-loading';
import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { useSession } from '@/lib/auth/client';
import { isApiError } from '@/lib/api/client';
import type { PinValue } from '@/components/map/PinPicker';
import { queryKeys } from '@/lib/query/keys';
import { runnerApi, type RunnerProfile } from './api';

const RunnerAreaPicker = dynamic(
  () => import('./runner-area-picker').then((module) => module.RunnerAreaPicker),
  { ssr: false, loading: () => <Skeleton className="h-72 rounded-[var(--r-lg)]" aria-label="Loading area map" /> },
);

type Transport = components['schemas']['TransportMethod'];
type Availability = components['schemas']['RunnerAvailability'];
type ProfileDraft = {
  center: PinValue | null;
  radiusKm: number;
  transport: Transport;
  excludedCategoryIds: string[];
};

function initialDraft(profile?: RunnerProfile): ProfileDraft {
  return {
    center: profile ? { ...profile.areaCenter, source: 'MANUAL' } : null,
    radiusKm: profile?.areaRadiusKm ?? 5,
    transport: profile?.transport ?? 'WALKING',
    excludedCategoryIds: profile?.excludedCategoryIds ?? [],
  };
}

const transportOptions: Array<{ value: Transport; label: string }> = [
  { value: 'WALKING', label: 'Walking' },
  { value: 'BICYCLE', label: 'Bicycle' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'CAR', label: 'Car' },
  { value: 'PUBLIC_TRANSPORT', label: 'Public transport' },
  { value: 'OTHER', label: 'Other' },
];

const eligibilityCopy: Record<string, string> = {
  ACCOUNT_NOT_ACTIVE: 'Your account must be active before you can take runner tasks.',
  PHONE_NOT_VERIFIED: 'Verify your phone number before you can offer.',
  NOT_VERIFIED: 'Complete identity verification before you can offer.',
  VERIFICATION_PENDING: 'Your identity check is still being reviewed.',
  NO_RUNNER_PROFILE: 'Save your runner profile and operating area to continue.',
  UNAVAILABLE: 'You are currently unavailable for new errands.',
  RESTRICTED: 'An account restriction currently prevents runner offers.',
};

function retrySeconds(error: unknown): number | undefined {
  if (!isApiError(error)) return undefined;
  const value = error.details.retryAfterSeconds;
  return typeof value === 'number' ? value : error.retryAfterSeconds;
}

function profileErrorCopy(error: unknown): string {
  if (!isApiError(error)) return 'We could not save your runner profile. Try again.';
  if (error.code === 'RATE_LIMITED') {
    const seconds = retrySeconds(error);
    return seconds
      ? `You moved your operating area recently. Wait ${seconds} seconds before moving it again.`
      : 'You moved your operating area recently. Wait a moment before moving it again.';
  }
  if (error.code === 'VALIDATION_ERROR') return 'Check that your centre is valid and your operating radius is between 1 and 20 km.';
  return 'We could not save your runner profile. Try again.';
}

export function RunnerProfilePage() {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const profileKey = useMemo(() => ['runner', 'profile', me.id] as const, [me.id]);
  const eligibilityKey = useMemo(() => ['runner', 'eligibility', me.id] as const, [me.id]);
  const profile = useQuery({
    queryKey: profileKey,
    queryFn: runnerApi.profile,
    retry: false,
  });
  const eligibility = useQuery({
    queryKey: eligibilityKey,
    queryFn: runnerApi.eligibility,
    retry: false,
  });
  const categories = useQuery({
    queryKey: queryKeys.reference.categories(),
    queryFn: runnerApi.categories,
    staleTime: 60 * 60 * 1000,
  });

  const [draftState, setDraft] = useState<ProfileDraft | null>(null);
  const { center, radiusKm, transport, excludedCategoryIds } = draftState ?? initialDraft(profile.data);
  const dirty = draftState !== null;
  const updateDraft = (updates: Partial<ProfileDraft>) =>
    setDraft((current) => ({ ...(current ?? initialDraft(profile.data)), ...updates }));
  const [radiusError, setRadiusError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');

  const saveProfile = useCallback(async () => {
    if (!center || radiusKm < 1 || radiusKm > 20 || !Number.isFinite(radiusKm)) return;
    setSavedMessage('');
    setRadiusError('');
    try {
      const updated = await runnerApi.updateProfile({
        transport,
        areaCenter: { lat: center.lat, lng: center.lng },
        areaRadiusKm: radiusKm,
        excludedCategoryIds,
      });
      queryClient.setQueryData(profileKey, updated);
      setDraft(null);
      setSavedMessage('Runner profile saved.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eligibilityKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.runner.eligibility() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all() }),
      ]);
    } catch (error) {
      queryClient.setQueryData(['runner', 'profile-save-error', me.id], error);
      setSavedMessage('');
      throw error;
    }
  }, [center, excludedCategoryIds, eligibilityKey, me.id, profileKey, queryClient, radiusKm, transport]);

  const [saveError, setSaveError] = useState<unknown>();
  const saveProfileWithError = async () => {
    setSaveError(undefined);
    try {
      await saveProfile();
    } catch (error) {
      setSaveError(error);
    }
  };

  const currentAvailability = profile.data?.availability ?? 'UNAVAILABLE';

  const updateAvailability = async (next: Availability) => {
    setAvailabilityError('');
    try {
      const updated = await runnerApi.updateAvailability(next);
      queryClient.setQueryData(profileKey, updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eligibilityKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.runner.eligibility() }),
      ]);
    } catch (error) {
      setAvailabilityError(
        isApiError(error) && error.code === 'RESOURCE_CONFLICT'
          ? 'Your runner eligibility changed. Review the reasons below and try again after resolving them.'
          : 'We could not update your availability. Try again.',
      );
      await eligibility.refetch();
    }
  };

  const missingProfile = isApiError(profile.error) && profile.error.status === 404;
  if (profile.isPending || eligibility.isPending || categories.isPending) {
    return <PageLoading title="Runner profile" eyebrow="Runner" width="max-w-5xl" />;
  }
  if ((profile.error && !missingProfile) || eligibility.error || categories.error || !categories.data) {
    const error = profile.error && !missingProfile ? profile.error : eligibility.error ?? categories.error;
    return (
      <main className="mx-auto max-w-5xl">
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>We could not load your runner profile requirements.</p>
            {isApiError(error) && error.requestId && <p className="text-xs">Request ID: {error.requestId}</p>}
            <Button type="button" variant="ghost" onClick={() => { void profile.refetch(); void eligibility.refetch(); void categories.refetch(); }}>Try again</Button>
          </div>
        </Alert>
      </main>
    );
  }

  const savedProfile = profile.data;
  const profileExists = Boolean(savedProfile);
  const saveDisabled = !center || radiusKm < 1 || radiusKm > 20 || !Number.isFinite(radiusKm);
  const reasons = eligibility.data?.reasons ?? [];

  return (
    <main className="mx-auto grid max-w-5xl gap-4">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Runner</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">Runner profile &amp; area</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Set where you work and what you can carry. Your exact operating-area centre is private and is never shown to requesters.</p>
      </header>

      {missingProfile && <Alert variant="info">Set your runner profile and operating area to start finding nearby errands.</Alert>}
      {profile.error && !missingProfile && <Alert variant="danger" role="alert">We could not load your saved runner profile.</Alert>}

      <section className="grid gap-5 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-6">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Your operating area</h2>
          <p className="mt-1 text-sm text-muted">Search for a place or choose the centre on the map. The map shows your private work area.</p>
        </div>
        <RunnerAreaPicker
          center={center}
          onCenterChange={(value) => { updateDraft({ center: value }); setSavedMessage(''); }}
          radiusKm={radiusKm}
          onRadiusChange={(value) => { updateDraft({ radiusKm: value }); setRadiusError(''); setSavedMessage(''); }}
          onInvalidRadius={(value) => setRadiusError(`Enter a radius from 1 to 20 km. "${value}" is outside the allowed range.`)}
        />
        {radiusError && <p role="alert" className="text-sm text-red">{radiusError}</p>}
        <label className="grid gap-1.5 text-sm font-bold text-ink-2">How do you usually travel?
          <select value={transport} onChange={(event) => updateDraft({ transport: event.target.value as Transport })} className="min-h-11 rounded-lg border border-line bg-panel px-3 font-normal">
            {transportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-extrabold text-ink">Categories you do not want to see</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.data.map((category) => (
              <label key={category.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-panel px-3 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={excludedCategoryIds.includes(category.id)}
                  onChange={(event) => {
                    updateDraft({
                      excludedCategoryIds: event.target.checked
                        ? [...excludedCategoryIds, category.id]
                        : excludedCategoryIds.filter((id) => id !== category.id),
                    });
                  }}
                  className="size-4 accent-lime-700"
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>
        {Boolean(saveError) && (
          <Alert variant="danger" role="alert">
            <p>{profileErrorCopy(saveError)}</p>
            {isApiError(saveError) && saveError.requestId && <p className="mt-1 text-xs">Request ID: {saveError.requestId}</p>}
          </Alert>
        )}
        {savedMessage && <Alert variant="ok" role="status">{savedMessage}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {profileExists && savedProfile && <span className="text-xs text-muted">{dirty ? 'Unsaved changes' : `Current status: ${savedProfile.availability.toLowerCase()}`}</span>}
          <Button type="button" disabled={saveDisabled || !dirty} onClick={() => void saveProfileWithError()}>{profileExists ? 'Save runner profile' : 'Create runner profile'}</Button>
        </div>
      </section>

      <section className="grid gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-ink">Availability</h2>
            <p className="mt-1 text-sm text-muted">{currentAvailability === 'AVAILABLE' ? 'You can appear in nearby runner results.' : 'You are paused and will not receive new offers.'}</p>
          </div>
          <Button
            type="button"
            variant={currentAvailability === 'AVAILABLE' ? 'ghost' : 'primary'}
            disabled={!profileExists}
            onClick={() => void updateAvailability(currentAvailability === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE')}
          >{currentAvailability === 'AVAILABLE' ? 'Go unavailable' : 'Set available'}</Button>
        </div>
        {availabilityError && <Alert variant="danger" role="alert">{availabilityError}</Alert>}
        {reasons.length > 0 && (
          <div className="grid gap-2 rounded-xl bg-amber-bg p-4" aria-label="Runner eligibility reasons">
            <strong className="text-sm text-ink">Before you can send offers</strong>
            {reasons.map((reason) => (
              <p key={reason} className="text-sm text-ink-2">
                {eligibilityCopy[reason] ?? 'Your account is not eligible for runner offers right now.'}{' '}
                {reason === 'PHONE_NOT_VERIFIED' && <a href="/settings/contact" className="font-bold underline">Verify phone</a>}
                {reason === 'NOT_VERIFIED' && <a href="/verification" className="font-bold underline">Verify identity</a>}
                {reason === 'VERIFICATION_PENDING' && <a href="/verification" className="font-bold underline">View status</a>}
                {reason === 'NO_RUNNER_PROFILE' && !profileExists && <span>Save this profile first.</span>}
                {reason === 'RESTRICTED' && <a href="/account/standing" className="font-bold underline">View account standing</a>}
              </p>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
