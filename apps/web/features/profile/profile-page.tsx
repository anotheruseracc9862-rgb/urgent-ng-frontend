'use client';

import Link from 'next/link';
import { ACCOUNT_MENU_ITEMS } from '@/components/shell/nav-items';
import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input, Skeleton, Textarea } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { MediaUpload } from '@/components/media/MediaUpload';
import { describeAuthError } from '@/features/auth/auth-ui';
import { authApi } from '@/lib/api/auth';
import type { Me, StartMode } from '@/lib/api/types';
import { useSession } from '@/lib/auth/client';
import { saveMode } from '@/lib/auth/mode';
import { api, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';

type MeSummary = components['schemas']['MeSummaryDto'];

interface ProfileDraft {
  name: string;
  bio: string;
  homeArea: string;
  startMode: StartMode;
}

function initialDraft(me: Me): ProfileDraft {
  return {
    name: me.name,
    bio: me.bio ?? '',
    homeArea: me.homeArea ?? '',
    startMode: me.startMode ?? 'REQUESTER',
  };
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function memberSince(date: string): string {
  const timestamp = Date.parse(date);
  return Number.isNaN(timestamp) ? 'Member since unavailable' : `Member since ${formatDate(date, 'short')}`;
}

export function ProfilePage() {
  const { me } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState(() => initialDraft(me));
  const [validationError, setValidationError] = React.useState<string>();
  const [saveError, setSaveError] = React.useState<string>();
  const [saveRequestId, setSaveRequestId] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string>();
  const [photoRequestId, setPhotoRequestId] = React.useState<string>();
  const [failedPhotoId, setFailedPhotoId] = React.useState<string>();
  const [isSavingPhoto, setIsSavingPhoto] = React.useState(false);
  const photoRequest = React.useRef<string | undefined>(undefined);

  const summary = useQuery({
    queryKey: queryKeys.dashboard.summary(me.id),
    queryFn: authApi.summary,
    staleTime: 30_000,
  });
  const photo = useQuery({
    queryKey: queryKeys.media.url(me.photoMediaId ?? ''),
    queryFn: () => api<components['schemas']['MediaUrlDto']>(`/media/${me.photoMediaId}/url`),
    enabled: me.photoMediaId !== null,
    staleTime: 4 * 60 * 1000,
    retry: false,
  });

  const setMe = React.useCallback((updated: Me) => {
    queryClient.setQueryData(queryKeys.auth.me(me.id), updated);
  }, [me.id, queryClient]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    const bio = draft.bio.trim();
    const homeArea = draft.homeArea.trim();
    if (name.length < 2 || name.length > 100) {
      setValidationError('Your display name must be between 2 and 100 characters.');
      return;
    }
    if (bio.length > 300) {
      setValidationError('About you must be 300 characters or fewer.');
      return;
    }
    if (homeArea.length > 80) {
      setValidationError('Your area must be 80 characters or fewer.');
      return;
    }

    setValidationError(undefined);
    setSaveError(undefined);
    setSaveRequestId(undefined);
    setSaved(false);
    setIsSaving(true);
    const modeChanged = draft.startMode !== me.startMode;
    try {
      const updated = await authApi.updateMe({
        name,
        bio: bio || null,
        homeArea: homeArea || null,
        startMode: draft.startMode,
      });
      setMe(updated);
      setDraft(initialDraft(updated));
      if (modeChanged) {
        saveMode(draft.startMode);
        router.refresh();
      }
      setSaved(true);
    } catch (error) {
      setSaveError(describeAuthError(error));
      setSaveRequestId(isApiError(error) ? error.requestId : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const savePhoto = React.useCallback(async (mediaId: string) => {
    if (photoRequest.current === mediaId || me.photoMediaId === mediaId) return;
    photoRequest.current = mediaId;
    setIsSavingPhoto(true);
    setPhotoError(undefined);
    setPhotoRequestId(undefined);
    setFailedPhotoId(undefined);
    try {
      const updated = await authApi.setProfilePhoto(mediaId);
      setMe(updated);
      await queryClient.invalidateQueries({ queryKey: queryKeys.media.url(mediaId) });
    } catch (error) {
      setFailedPhotoId(mediaId);
      setPhotoError(describeAuthError(error));
      setPhotoRequestId(isApiError(error) ? error.requestId : undefined);
    } finally {
      photoRequest.current = undefined;
      setIsSavingPhoto(false);
    }
  }, [me.photoMediaId, queryClient, setMe]);

  const mediaChanged = (ids: string[]) => {
    const replacement = ids.find((id) => id !== me.photoMediaId);
    if (replacement) void savePhoto(replacement);
    else if (ids.length === 0) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me(me.id) });
    }
  };

  const retryPhoto = () => {
    if (failedPhotoId) void savePhoto(failedPhotoId);
  };

  const changeDraft = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setValidationError(undefined);
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Account</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Profile &amp; account</h1>
        <p className="mt-1 text-sm text-muted">Manage your details and the way you use Urgent.ng.</p>
      </header>

      <nav aria-label="More from your account" className="grid gap-2 rounded-[var(--r-lg)] border border-line bg-surface p-3 shadow-[var(--shadow)] sm:grid-cols-2 lg:grid-cols-3">
        {ACCOUNT_MENU_ITEMS.filter((item) => item.href !== '/profile').map(({ href, label, icon: Icon, mode }) => (
          <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-full px-3 text-[13.5px] font-semibold text-ink-2 transition-colors hover:bg-panel">
            <Icon className="size-[18px] shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {mode ? <span className="rounded-full bg-panel px-2 py-0.5 text-[10px] font-bold uppercase text-muted">{mode === 'RUNNER' ? 'Runner' : 'Requester'}</span> : null}
          </Link>
        ))}
      </nav>

      <Card variant="tint" className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative grid size-[84px] shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-[26px] font-extrabold text-lime">
            {photo.data?.url ? (
              <Image src={photo.data.url} alt={`${me.name} profile photo`} fill unoptimized sizes="84px" className="object-cover" />
            ) : initials(me.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-extrabold tracking-tight text-ink">{me.name}</h2>
            <p className="mt-1 text-sm text-muted">{memberSince(me.createdAt)}</p>
            <div className="mt-2 inline-flex rounded-full bg-lime/30 px-3 py-1 text-xs font-bold text-green-900">
              {me.startMode === 'RUNNER' ? 'Runner account' : 'Requester account'}
            </div>
          </div>
        </div>
        {photo.isError && (
          <Alert variant="danger" role="alert" className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{describeAuthError(photo.error)}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void photo.refetch()}>Retry photo</Button>
            </div>
            {isApiError(photo.error) && photo.error.requestId && (
              <p className="mt-1 text-xs">Request ID: {photo.error.requestId}</p>
            )}
          </Alert>
        )}
      </Card>

      <Stats summary={summary.data} isLoading={summary.isPending} error={summary.error} onRetry={() => void summary.refetch()} mode={me.startMode ?? 'REQUESTER'} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Personal details</CardTitle>
            <CardDescription>Your name and profile details are shown to people you work with.</CardDescription>
          </div>
        </CardHeader>
        <form className="grid gap-5" onSubmit={(event) => void saveProfile(event)} noValidate>
          <label className="grid gap-1.5 text-sm font-semibold text-ink-2">
            Display name
            <Input
              autoComplete="name"
              maxLength={100}
              required
              value={draft.name}
              onChange={(event) => changeDraft('name', event.currentTarget.value)}
              aria-describedby={validationError ? 'profile-form-error' : undefined}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-ink-2">
            Phone
            <Input
              value={me.phone ?? 'No phone added'}
              readOnly
              aria-describedby="profile-phone-help"
              className="bg-panel text-muted"
            />
            <span id="profile-phone-help" className="text-xs font-normal text-muted">
              {me.phoneVerified ? 'Verified phone number. Change it in contact settings.' : 'Phone number is managed in contact settings.'}
            </span>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-ink-2">
            About you
            <Textarea
              maxLength={300}
              rows={3}
              value={draft.bio}
              onChange={(event) => changeDraft('bio', event.currentTarget.value)}
              placeholder="A short introduction for your public profile"
            />
            <span className="text-right text-xs font-normal text-muted">{draft.bio.length}/300</span>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-ink-2">
            Home area
            <Input
              maxLength={80}
              value={draft.homeArea}
              onChange={(event) => changeDraft('homeArea', event.currentTarget.value)}
              placeholder="For example, Lekki, Lagos"
            />
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-ink-2">What do you want to do first?</legend>
            <p className="text-xs text-muted">You can switch between requesting and running errands any time.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['REQUESTER', 'Get an errand done', 'Post what you need and receive offers.'],
                ['RUNNER', 'Run errands and earn', 'Find nearby errands and send offers.'],
              ] as const).map(([mode, title, description]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={draft.startMode === mode}
                  onClick={() => changeDraft('startMode', mode)}
                  className={`min-h-20 rounded-[var(--r)] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 ${
                    draft.startMode === mode ? 'border-lime-600 bg-tint' : 'border-line bg-surface hover:bg-panel'
                  }`}
                >
                  <span className="block text-sm font-bold text-ink">{title}</span>
                  <span className="mt-1 block text-xs font-normal text-muted">{description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {validationError && <p id="profile-form-error" role="alert" className="text-sm font-semibold text-red">{validationError}</p>}
          {saveError && (
            <Alert variant="danger" role="alert">
              <p>{saveError}</p>
              {saveRequestId && <p className="mt-1 text-xs">Request ID: {saveRequestId}</p>}
            </Alert>
          )}
          {saved && <p role="status" className="text-sm font-semibold text-green-800">Profile updated.</p>}

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSaving}>Save profile</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile photo</CardTitle>
            <CardDescription>Choose a clear photo. JPEG, PNG, or WebP up to 5 MB.</CardDescription>
          </div>
        </CardHeader>
        {photoError && (
          <Alert variant="danger" role="alert" className="mb-4">
            <p>{photoError}</p>
            {photoRequestId && <p className="mt-1 text-xs">Request ID: {photoRequestId}</p>}
            {failedPhotoId && (
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={retryPhoto} isLoading={isSavingPhoto}>
                Retry saving photo
              </Button>
            )}
          </Alert>
        )}
        {isSavingPhoto && <p role="status" className="mb-3 text-sm text-muted">Saving your new photo…</p>}
        <MediaUpload
          purpose="PROFILE_PHOTO"
          value={me.photoMediaId ? [me.photoMediaId] : []}
          maxFiles={me.photoMediaId ? 2 : 1}
          onChange={mediaChanged}
        />
      </Card>
    </div>
  );
}

function Stats({
  summary,
  isLoading,
  error,
  onRetry,
  mode,
}: {
  summary?: MeSummary;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  mode: StartMode;
}) {
  if (isLoading) {
    const labels = mode === 'RUNNER'
      ? ['Completed in 30 days', 'Offers this week', 'Active assignments']
      : ['Errands this month', 'Completed this month', 'Open errands'];
    return (
      <section aria-label="Profile stats" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        {labels.map((label) => (
          <Card key={label} variant="flat" className="p-4">
            <p className="text-2xl font-extrabold tracking-tight text-ink">—</p>
            <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
          </Card>
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" role="alert">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>We could not load your profile stats.</p>
          <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Retry stats</Button>
        </div>
        {isApiError(error) && error.requestId && <p className="mt-1 text-xs">Request ID: {error.requestId}</p>}
      </Alert>
    );
  }

  if (!summary) return null;
  const stats = mode === 'RUNNER'
    ? [
        ['Completed in 30 days', summary.asRunner.completedLast30Days],
        ['Offers this week', summary.asRunner.offersThisWeek],
        ['Active assignments', summary.asRunner.activeAssignments],
      ] as const
    : [
        ['Errands this month', summary.asRequester.errandsThisMonth],
        ['Completed this month', summary.asRequester.completedThisMonth],
        ['Open errands', summary.asRequester.openErrands],
      ] as const;

  return (
    <section aria-label="Profile stats" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
      {stats.map(([label, value]) => (
        <Card key={label} variant="flat" className="p-4">
          <p className="text-2xl font-extrabold tracking-tight text-ink">{value}</p>
          <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
        </Card>
      ))}
    </section>
  );
}
