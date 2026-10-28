'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@urgent/ui';
import { Bike, Bus, Car, Check, Footprints, MapPin, MoreHorizontal, Motorbike, ShieldCheck, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { PageHead } from '@/components/shell/page-head';
import { useSession } from '@/lib/auth/client';
import { isApiError } from '@/lib/api/client';
import type { PinValue } from '@/components/map/PinPicker';
import { queryKeys } from '@/lib/query/keys';
import { runnerApi, type RunnerProfile, type AreaMode } from './api';

const RunnerAreaPicker = dynamic(
  () => import('./runner-area-picker').then((module) => module.RunnerAreaPicker),
  { ssr: false, loading: () => <Skeleton className="h-72 rounded-[var(--r-lg)]" aria-label="Loading area map" /> },
);

type Transport = components['schemas']['TransportMethod'];
type Availability = components['schemas']['RunnerAvailability'];
type ProfileDraft = {
  areaMode: AreaMode;
  stateId: string;
  lgaIds: string[];
  center: PinValue | null;
  radiusKm: number;
  transport: Transport;
  excludedCategoryIds: string[];
};

function initialDraft(profile?: RunnerProfile): ProfileDraft {
  return {
    areaMode: profile ? profile.areaMode ?? 'RADIUS' : 'STATE',
    stateId: profile?.areaStateIds?.[0] ?? '',
    lgaIds: profile?.areaLgaIds ?? [],
    center: profile?.areaCenter ? { ...profile.areaCenter, source: 'MANUAL' } : null,
    radiusKm: profile?.areaRadiusKm ?? 5,
    transport: profile?.transport ?? 'WALKING',
    excludedCategoryIds: profile?.excludedCategoryIds ?? [],
  };
}

const transportOptions: Array<{ value: Transport; label: string; icon: LucideIcon }> = [
  { value: 'WALKING', label: 'Walking', icon: Footprints },
  { value: 'BICYCLE', label: 'Bicycle', icon: Bike },
  { value: 'MOTORCYCLE', label: 'Motorcycle', icon: Motorbike },
  { value: 'CAR', label: 'Car', icon: Car },
  { value: 'PUBLIC_TRANSPORT', label: 'Public transport', icon: Bus },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal },
];

const eligibilityCopy: Record<string, string> = {
  OPERATING_AREA_REQUIRED: 'Confirm your operating area and save your profile before sending offers.',
  ACCOUNT_NOT_ACTIVE: 'Your account must be active before you can take runner tasks.',
  PHONE_NOT_VERIFIED: 'Verify your phone number before you can offer.',
  NOT_VERIFIED: 'Complete identity verification before you can offer.',
  VERIFICATION_PENDING: 'Your identity check is still being reviewed.',
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
  if (error.code === 'VALIDATION_ERROR') return 'Check your coverage selection. For nearby radius, choose a centre and a radius between 1 and 20 km.';
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
  const { center, radiusKm, transport, excludedCategoryIds, areaMode, stateId, lgaIds } = draftState ?? initialDraft(profile.data);
  const serviceAreas = useQuery({ queryKey: ['reference', 'service-areas'], queryFn: runnerApi.serviceAreas, staleTime: 60 * 60 * 1000, retry: false });
  const selectedState = serviceAreas.data?.states.find((state) => state.id === stateId);
  const validLgaIds = useMemo(() => lgaIds.filter((id) => selectedState?.lgas.some((lga) => lga.id === id)), [lgaIds, selectedState]);
  const [lgaSearch, setLgaSearch] = useState('');
  const coverageValid = areaMode === 'RADIUS'
    ? Boolean(center) && radiusKm >= 1 && radiusKm <= 20 && Number.isFinite(radiusKm)
    : Boolean(selectedState) && !serviceAreas.isError && (areaMode === 'STATE' || validLgaIds.length > 0);
  const dirty = draftState !== null;
  const [radiusError, setRadiusError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [saveError, setSaveError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [areaResetKey, setAreaResetKey] = useState(0);
  const updateDraft = (updates: Partial<ProfileDraft>) => {
    if (saving) return;
    setDraft((current) => ({ ...(current ?? initialDraft(profile.data)), ...updates }));
    setSavedMessage('');
    setSaveError(undefined);
  };

  const saveProfile = useCallback(async () => {
    if (!coverageValid) return;
    setSavedMessage('');
    setRadiusError('');
    try {
      const updated = await runnerApi.updateProfile({
        transport,
        areaMode,
        areaStateIds: areaMode === 'RADIUS' ? [] : [stateId],
        areaLgaIds: areaMode === 'LGAS' ? validLgaIds : [],
        areaCenter: areaMode === 'RADIUS' && center ? { lat: center.lat, lng: center.lng } : null,
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
  }, [areaMode, stateId, validLgaIds, coverageValid, center, excludedCategoryIds, eligibilityKey, me.id, profileKey, queryClient, radiusKm, transport]);

  const saveProfileWithError = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(undefined);
    try {
      await saveProfile();
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  const currentAvailability = profile.data?.availability ?? 'UNAVAILABLE';

  const updateAvailability = async (next: Availability) => {
    if (updatingAvailability) return;
    setUpdatingAvailability(true);
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
    } finally {
      setUpdatingAvailability(false);
    }
  };

  // A runner with no profile has no cached data, so each refetch of the 404 query reads as "pending"
  // again. Show the skeleton for the first load only, and keep the last 404 verdict while refetching.
  const [settled, setSettled] = useState({ loaded: false, missing: false });
  const stillLoading = profile.isPending || eligibility.isPending || categories.isPending;
  const profileMissing = isApiError(profile.error) && profile.error.status === 404;
  if (!profile.isPending && settled.missing !== profileMissing) setSettled((current) => ({ ...current, missing: profileMissing }));
  if (!stillLoading && !settled.loaded) setSettled((current) => ({ ...current, loaded: true }));
  const missingProfile = profile.isPending ? settled.missing : profileMissing;
  if (stillLoading && !settled.loaded) {
    return (
      <div className="grid min-w-0 content-start gap-4 pb-10" aria-busy="true">
        <PageHead
          eyebrow="Runner"
          title="Runner profile & area"
          description="Choose where you work, how you travel, and which errands you see."
        />
        <section aria-label="Loading operating area" className="grid gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-72 rounded-[var(--r-lg)]" />
          <Skeleton className="h-11 w-40 rounded-full" />
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-11 rounded-lg" />)}
          </div>
          <Skeleton className="ml-auto h-10 w-40 rounded-full" />
        </section>
        <section aria-label="Loading availability" className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </section>
      </div>
    );
  }
  if ((profile.error && !missingProfile) || eligibility.error || categories.error || !categories.data) {
    const error = profile.error && !missingProfile ? profile.error : eligibility.error ?? categories.error;
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <PageHead eyebrow="Runner" title="Runner profile & area" />
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>We could not load your runner profile requirements.</p>
            <Button type="button" variant="ghost" onClick={() => { void profile.refetch(); void eligibility.refetch(); void categories.refetch(); }}>Try again</Button>
          </div>
        </Alert>
      </main>
    );
  }

  const savedProfile = profile.data;
  const profileExists = Boolean(savedProfile);
  const needsAreaConfirmation = savedProfile?.areaStateIds?.length === 0;
  const saveDisabled = !coverageValid || (areaMode === 'RADIUS' && Boolean(radiusError));
  const reasons = (eligibility.data?.reasons ?? []).filter((reason) => reason !== 'UNAVAILABLE' && reason !== 'NO_RUNNER_PROFILE');

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Runner"
        title="Runner profile & area"
        description="Choose where you work, how you travel, and which errands you see."
        actions={<span className="inline-flex items-center gap-2 rounded-full bg-tint-2 px-3 py-2 text-xs font-bold text-green-900"><ShieldCheck aria-hidden="true" className="size-4" />Your exact centre stays private</span>}
      />

      <section aria-label="Runner profile actions" className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r)] border border-line bg-surface p-3 shadow-[var(--shadow)] sm:top-4 sm:px-5">
        <div className="min-w-0">
          <strong className="block text-[13px] text-ink" aria-live="polite">{saving ? 'Saving your profile…' : dirty ? 'Unsaved changes' : profileExists ? 'Your profile is up to date' : 'Ready for your first errand?'}</strong>
          <span className="text-xs text-muted">{areaMode === 'RADIUS' ? !center ? 'Choose your operating-area centre to continue.' : `${radiusKm} km radius` : !selectedState ? 'Choose a state to continue.' : areaMode === 'STATE' ? `Entire ${selectedState.name}` : `${validLgaIds.length} LGAs in ${selectedState.name}`}</span>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button type="button" size="sm" variant="ghost" disabled={!dirty || saving} className="flex-1 sm:flex-none" onClick={() => { setDraft(null); setLgaSearch(''); setAreaResetKey((key) => key + 1); setRadiusError(''); setSaveError(undefined); setSavedMessage(''); }}>Discard changes</Button>
          <Button type="button" size="sm" disabled={saveDisabled || (!dirty && !needsAreaConfirmation) || updatingAvailability} isLoading={saving} className="flex-1 sm:flex-none" onClick={() => void saveProfileWithError()}>{profileExists ? 'Save runner profile' : 'Create runner profile'}</Button>
        </div>
        {Boolean(saveError) && (
          <Alert variant="danger" role="alert" className="w-full">
            <p>{profileErrorCopy(saveError)}</p>
          </Alert>
        )}
        {savedMessage && <Alert variant="ok" role="status" className="w-full">{savedMessage}</Alert>}
      </section>

      <section aria-labelledby="runner-area-heading" className="grid min-w-0 gap-5 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-tint-2 text-green-900">
            <MapPin className="size-[18px]" />
          </span>
          <div>
            <h2 id="runner-area-heading" className="text-base font-extrabold tracking-tight text-ink">Your operating area</h2>
            <p className="mt-1 text-xs leading-5 text-muted">Choose a state, specific LGAs, or a nearby radius. Errands stay within one state.</p>
          </div>
        </div>
        <fieldset disabled={saving} className="grid gap-2 sm:grid-cols-3">
          <legend className="mb-3 text-sm font-bold text-ink">Coverage</legend>
          {([{ value: 'STATE', label: 'Entire state' }, { value: 'LGAS', label: 'Specific LGAs' }, { value: 'RADIUS', label: 'Nearby radius' }] as const).map(({ value, label }) => (
            <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-[var(--r-sm)] border px-4 py-3 text-[13px] font-bold focus-within:ring-2 focus-within:ring-green-700 ${areaMode === value ? 'border-green-700 bg-tint text-green-900' : 'border-line text-ink-2 hover:bg-panel'}`}>
              <input type="radio" name="coverage" checked={areaMode === value} onChange={() => updateDraft({ areaMode: value })} className="accent-green-700" />{label}
            </label>
          ))}
        </fieldset>
        {areaMode !== 'RADIUS' && (
          <div className="grid gap-4">
            {serviceAreas.isPending ? <Skeleton className="h-12 rounded-lg" aria-label="Loading states" /> : serviceAreas.isError || !serviceAreas.data?.states.length ? (
              <Alert variant="danger" role="alert"><p>{serviceAreas.isError ? 'We could not load coverage areas.' : 'Coverage areas are not available yet.'}</p><Button type="button" variant="ghost" onClick={() => void serviceAreas.refetch()}>Reload areas</Button></Alert>
            ) : (
              <div className="grid gap-2">
                <label htmlFor="runner-coverage-state" className="text-sm font-bold text-ink">State</label>
                <Select disabled={saving} value={stateId} onValueChange={(value) => { updateDraft({ stateId: value, lgaIds: [] }); setLgaSearch(''); }}>
                  <SelectTrigger id="runner-coverage-state" className="text-left font-semibold text-ink transition-[border-color,box-shadow,background-color] hover:border-green-700/50 focus:border-green-700 focus:shadow-[0_0_0_3px_var(--color-tint)] data-[placeholder]:font-normal data-[placeholder]:text-muted data-[state=open]:border-green-700 data-[state=open]:bg-tint-2 [&>svg]:text-green-700 [&>svg]:opacity-100 motion-reduce:transition-none">
                    <SelectValue placeholder="Choose a state" />
                  </SelectTrigger>
                  <SelectContent sideOffset={6} className="max-h-[min(320px,var(--radix-select-content-available-height))] border-line p-1 text-ink shadow-[var(--shadow-pop)]">
                    {serviceAreas.data.states.map((state) => <SelectItem key={state.id} value={state.id} className="cursor-pointer px-3 pr-10 text-[13px] font-medium focus:bg-tint-2 focus:text-green-900 data-[state=checked]:bg-tint data-[state=checked]:font-bold data-[state=checked]:text-green-900">{state.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {areaMode === 'STATE' && selectedState && <p className="text-[13px] leading-5 text-muted">You’ll see local errands across {selectedState.name}. No map pin needed.</p>}
            {areaMode === 'LGAS' && selectedState && (
              <fieldset disabled={saving} className="grid min-w-0 gap-3">
                <legend className="mb-2 text-sm font-bold text-ink">Local government areas</legend>
                <div className="flex flex-wrap items-center gap-2">
                  <span role="status" className="text-xs font-bold text-muted">{validLgaIds.length} selected</span>
                  {validLgaIds.length > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => updateDraft({ lgaIds: [] })}>Clear selection</Button>}
                  {selectedState.lgas.filter((lga) => validLgaIds.includes(lga.id)).map((lga) => <button key={lga.id} type="button" aria-label={`Remove ${lga.name}`} onClick={() => updateDraft({ lgaIds: lgaIds.filter((id) => id !== lga.id) })} className="rounded-full bg-tint px-3 py-2 text-xs font-bold text-green-900">{lga.name} ×</button>)}
                </div>
                <label className="grid gap-2 text-xs font-bold text-ink">Search LGAs<input type="search" value={lgaSearch} onChange={(event) => setLgaSearch(event.target.value)} className="min-h-11 rounded-[var(--r-sm)] border border-line bg-surface px-3 text-sm font-normal" /></label>
                <div className="grid max-h-64 gap-1 overflow-y-auto rounded-[var(--r-sm)] border border-line p-2 sm:grid-cols-2">
                  {selectedState.lgas.filter((lga) => lga.name.toLowerCase().includes(lgaSearch.toLowerCase())).map((lga) => <label key={lga.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-[13px] text-ink-2 hover:bg-panel"><input type="checkbox" checked={validLgaIds.includes(lga.id)} onChange={(event) => updateDraft({ lgaIds: event.target.checked ? [...validLgaIds, lga.id] : validLgaIds.filter((id) => id !== lga.id) })} className="size-4 accent-green-700" />{lga.name}</label>)}
                  {!selectedState.lgas.length && <div className="p-3 text-sm text-muted"><p>No LGAs are available here yet. Choose entire state or reload areas.</p><Button type="button" variant="ghost" onClick={() => void serviceAreas.refetch()}>Reload areas</Button></div>}
                  {selectedState.lgas.length > 0 && !selectedState.lgas.some((lga) => lga.name.toLowerCase().includes(lgaSearch.toLowerCase())) && <p className="p-3 text-sm text-muted">No LGAs match your search.</p>}
                </div>
              </fieldset>
            )}
          </div>
        )}
        {areaMode === 'RADIUS' && <RunnerAreaPicker
          key={areaResetKey}
          center={center}
          onCenterChange={(value) => updateDraft({ center: value })}
          radiusKm={radiusKm}
          onRadiusChange={(value) => { updateDraft({ radiusKm: value }); setRadiusError(''); }}
          onInvalidRadius={(value) => setRadiusError(`Enter a radius from 1 to 20 km. "${value}" is outside the allowed range.`)}
        />}
        {areaMode === 'RADIUS' && radiusError && <p role="alert" className="text-sm text-red">{radiusError}</p>}
      </section>

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="runner-preferences-heading" className="grid min-w-0 gap-5 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-panel text-ink-2"><SlidersHorizontal className="size-[18px]" /></span>
            <div>
              <h2 id="runner-preferences-heading" className="text-base font-extrabold tracking-tight text-ink">Make it work for you</h2>
              <p className="mt-1 text-xs leading-5 text-muted">Tailor your marketplace to the errands you want to run.</p>
            </div>
          </div>
          <fieldset disabled={saving} className="grid min-w-0 gap-3">
            <legend className="mb-3 text-sm font-bold text-ink">How do you usually travel?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {transportOptions.map(({ value, label, icon: Icon }) => (
                <label key={value} className={`flex min-h-16 min-w-0 cursor-pointer items-center gap-2 rounded-[var(--r-sm)] border px-3 py-2 text-xs font-bold transition-colors focus-within:ring-2 focus-within:ring-green-700 motion-reduce:transition-none ${transport === value ? 'border-green-700 bg-tint text-green-900' : 'border-line text-ink-2 hover:bg-panel'}`}>
                  <input type="radio" name="runner-transport" value={value} checked={transport === value} onChange={() => updateDraft({ transport: value })} className="sr-only" />
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span>{label}</span>
                  {transport === value && <Check aria-hidden="true" className="ml-auto size-3.5 shrink-0" />}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={saving} className="grid min-w-0 gap-3 border-t border-line-2 pt-5">
            <legend className="float-left w-full text-sm font-bold text-ink">Hide errand categories</legend>
            <p className="clear-both text-xs leading-5 text-muted">Select categories to leave out of your feed. Leave all unchecked to see every category.</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {categories.data.map((category) => (
                <label key={category.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--r-sm)] px-3 text-[13px] transition-colors motion-reduce:transition-none ${excludedCategoryIds.includes(category.id) ? 'bg-panel text-ink' : 'text-ink-2 hover:bg-panel'}`}>
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
                    className="size-4 shrink-0 accent-green-700"
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <aside className="grid min-w-0 content-start gap-4">
          <section aria-labelledby="runner-availability-heading" className="grid gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="runner-availability-heading" className="text-base font-extrabold tracking-tight text-ink">Availability</h2>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${currentAvailability === 'AVAILABLE' ? 'bg-ok-bg text-ok' : 'bg-panel text-muted'}`}>
                  {currentAvailability === 'AVAILABLE' ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-5 text-muted">{currentAvailability === 'AVAILABLE' ? 'You are available for nearby errands. Pause whenever you need a break.' : 'Go online when you are ready to find nearby errands and send offers.'}</p>
            </div>
            <Button
              type="button"
              variant={currentAvailability === 'AVAILABLE' ? 'ghost' : 'primary'}
              disabled={!profileExists || saving}
              isLoading={updatingAvailability}
              onClick={() => void updateAvailability(currentAvailability === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE')}
            >{currentAvailability === 'AVAILABLE' ? 'Go unavailable' : 'Set available'}</Button>
            <p className="text-xs leading-5 text-muted">{profileExists ? 'Availability updates immediately, separately from your profile.' : 'Create your runner profile before going online.'}</p>
            {availabilityError && <Alert variant="danger" role="alert">{availabilityError}</Alert>}
            {reasons.length > 0 && (
              <div className={`grid gap-2 rounded-[var(--r-sm)] p-3 ${reasons.includes('RESTRICTED') || reasons.includes('ACCOUNT_NOT_ACTIVE') ? 'bg-amber-bg' : 'bg-panel'}`} aria-label="Runner eligibility reasons">
                <strong className="text-xs font-extrabold text-ink">Before you can send offers</strong>
                {reasons.map((reason) => (
                  <p key={reason} className="text-xs leading-5 text-ink-2">
                    {eligibilityCopy[reason] ?? 'Your account is not eligible for runner offers right now.'}{' '}
                    {reason === 'PHONE_NOT_VERIFIED' && <Link href="/settings/contact" className="font-bold underline">Verify phone</Link>}
                    {reason === 'NOT_VERIFIED' && <Link href="/verification" className="font-bold underline">Verify identity</Link>}
                    {reason === 'VERIFICATION_PENDING' && <Link href="/verification" className="font-bold underline">View status</Link>}
                    {(reason === 'RESTRICTED' || reason === 'ACCOUNT_NOT_ACTIVE') && <Link href="/account/standing" className="font-bold underline">View account standing</Link>}
                  </p>
                ))}
              </div>
            )}
          </section>
          <div className="rounded-[var(--r-lg)] bg-ink p-5 text-white">
            <ShieldCheck aria-hidden="true" className="mb-3 size-6 text-lime" />
            <h2 className="text-sm font-extrabold">A work area, not your home address</h2>
            <p className="mt-2 text-xs leading-5 text-[#d9e0e8]">Choose where you want to work. State and LGA coverage need no pin. If you use a radius, your exact centre stays private.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
