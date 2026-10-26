'use client';

import { ProBadge, useIsPro } from '@/components/runner/pro-badge';
import Link from 'next/link';
import { accountMenuFor, type ShellMode } from '@/components/shell/nav-items';
import * as React from 'react';
import Image from 'next/image';
import { Camera, Check, ChevronRight, MapPin, Settings, ShieldCheck, Star, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Textarea,
} from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { MediaUpload } from '@/components/media/MediaUpload';
import { MobileSignOut } from '@/components/shell/mobile-sign-out';
import { describeAuthError } from '@/features/auth/auth-ui';
import { authApi } from '@/lib/api/auth';
import type { Me, StartMode } from '@/lib/api/types';
import { useSession } from '@/lib/auth/client';
import { saveMode } from '@/lib/auth/mode';
import { api } from '@/lib/api/client';
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
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  );
}

function memberSince(date: string): string {
  const timestamp = Date.parse(date);
  return Number.isNaN(timestamp)
    ? 'Member since unavailable'
    : `Member since ${formatDate(date, 'short')}`;
}

export function ProfilePage({ mode }: { mode: ShellMode }) {
  const { me } = useSession();
  const isPro = useIsPro(mode === 'RUNNER');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState(() => initialDraft(me));
  const [showPhotoEditor, setShowPhotoEditor] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string>();
  const [saveError, setSaveError] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string>();
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

  const setMe = React.useCallback(
    (updated: Me) => {
      queryClient.setQueryData(queryKeys.auth.me(me.id), updated);
    },
    [me.id, queryClient],
  );

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
    } finally {
      setIsSaving(false);
    }
  };

  const savePhoto = React.useCallback(
    async (mediaId: string) => {
      if (photoRequest.current === mediaId || me.photoMediaId === mediaId) return;
      photoRequest.current = mediaId;
      setIsSavingPhoto(true);
      setPhotoError(undefined);
      setFailedPhotoId(undefined);
      try {
        const updated = await authApi.setProfilePhoto(mediaId);
        setMe(updated);
        await queryClient.invalidateQueries({ queryKey: queryKeys.media.url(mediaId) });
      } catch (error) {
        setFailedPhotoId(mediaId);
        setPhotoError(describeAuthError(error));
      } finally {
        photoRequest.current = undefined;
        setIsSavingPhoto(false);
      }
    },
    [me.photoMediaId, queryClient, setMe],
  );

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

  const menuItems = accountMenuFor(mode);
  // The desktop rail already has My offers; phones only get five bottom-nav slots, so list it here too.
  const roleLinks = [
    ...(mode === 'RUNNER' ? [{ href: '/offers', label: 'My offers', icon: Tag, mobileOnly: true }] : []),
    ...menuItems.filter((item) => item.mode).map((item) => ({ ...item, mobileOnly: false })),
  ];
  const sharedLinks = [
    { href: '/settings', label: 'Settings', icon: Settings },
    ...menuItems.filter(
      (item) =>
        !item.mode && !['/profile', '/ratings', '/settings/notifications'].includes(item.href),
    ),
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <header className="px-1.5 pt-1">
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-green-800">
          Your account
        </p>
        <h1 className="text-[clamp(24px,3vw,32px)] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">
          Profile &amp; account
        </h1>
        <p className="mt-1.5 text-sm text-muted">One profile, however you use Urgent.ng.</p>
      </header>

      <Card variant="tint" className="border border-[#dce9c4] p-4 sm:p-[22px]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative grid size-[76px] shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-2xl font-extrabold text-lime ring-4 ring-white/80 sm:size-[84px]">
            {photo.data?.url ? (
              <Image
                src={photo.data.url}
                alt={`${me.name} profile photo`}
                fill
                unoptimized
                sizes="84px"
                className="object-cover"
              />
            ) : (
              initials(me.name)
            )}
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <h2 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 break-words text-xl font-extrabold tracking-tight text-ink">
              {me.name}
              {isPro ? <ProBadge className="py-1 text-xs" /> : null}
            </h2>
            <p className="mt-1 text-xs text-muted">{memberSince(me.createdAt)}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-green-900">
                {mode === 'RUNNER' ? 'Runner mode' : 'Requester mode'}
              </span>
              {me.phoneVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-900">
                  <ShieldCheck aria-hidden="true" className="size-3.5" /> Phone verified
                </span>
              )}
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={showPhotoEditor}
              aria-controls="profile-photo-editor"
              onClick={() => setShowPhotoEditor((open) => !open)}
            >
              <Camera aria-hidden="true" />{' '}
              {showPhotoEditor ? 'Close photo editor' : 'Change photo'}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/ratings">
                <Star aria-hidden="true" /> Reviews
              </Link>
            </Button>
          </div>
        </div>
        {photo.isError && (
          <Alert variant="danger" role="alert" className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{describeAuthError(photo.error)}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void photo.refetch()}>
                Retry photo
              </Button>
            </div>
          </Alert>
        )}
        <div id="profile-photo-editor" hidden={!showPhotoEditor}>
          <div className="mt-5 border-t border-[#dce9c4] pt-5">
            <h3 className="text-sm font-extrabold text-ink">Profile photo</h3>
            <p className="mb-4 mt-1 text-xs text-muted">
              Choose a clear photo. JPEG, PNG, or WebP up to 5 MB.
            </p>
            {photoError && (
              <Alert variant="danger" role="alert" className="mb-4">
                <p>{photoError}</p>
                {failedPhotoId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={retryPhoto}
                    isLoading={isSavingPhoto}
                  >
                    Retry saving photo
                  </Button>
                )}
              </Alert>
            )}
            {isSavingPhoto && (
              <p role="status" className="mb-3 text-sm text-muted">
                Saving your new photo…
              </p>
            )}
            <MediaUpload
              purpose="PROFILE_PHOTO"
              value={me.photoMediaId ? [me.photoMediaId] : []}
              maxFiles={me.photoMediaId ? 2 : 1}
              onChange={mediaChanged}
            />
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <Card className="border border-line p-4 sm:p-[22px]">
          <CardHeader>
            <div>
              <CardTitle>Personal details</CardTitle>
              <CardDescription>
                Your public details are shared across requester and runner modes.
              </CardDescription>
            </div>
          </CardHeader>
          <form className="grid gap-4" onSubmit={(event) => void saveProfile(event)} noValidate>
            <div className="grid items-start gap-4 sm:grid-cols-2">
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
                  {me.phoneVerified ? 'Verified number. ' : 'Managed in contact settings. '}
                  <Link
                    href="/settings/contact"
                    className="font-semibold text-green-800 underline decoration-green-800/30 underline-offset-2 hover:decoration-green-800"
                  >
                    Change contact details
                  </Link>
                </span>
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink-2">
              About you
              <Textarea
                maxLength={300}
                rows={3}
                value={draft.bio}
                onChange={(event) => changeDraft('bio', event.currentTarget.value)}
                placeholder="A short introduction for your public profile"
              />
              <span className="text-right text-xs font-normal text-muted">
                {draft.bio.length}/300
              </span>
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
              <legend className="text-sm font-semibold text-ink-2">Preferred starting mode</legend>
              <p className="mb-1 mt-1 text-xs text-muted">
                Choose where you start. You can still switch modes any time from the top bar.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['REQUESTER', 'Get an errand done', 'Post what you need and receive offers.'],
                    ['RUNNER', 'Run errands and earn', 'Find nearby errands and send offers.'],
                  ] as const
                ).map(([startMode, title, description]) => (
                  <button
                    key={startMode}
                    type="button"
                    aria-pressed={draft.startMode === startMode}
                    onClick={() => changeDraft('startMode', startMode)}
                    className={`min-h-24 rounded-[var(--r)] border p-3.5 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 ${
                      draft.startMode === startMode
                        ? 'border-lime-600 bg-tint shadow-[0_0_0_1px_var(--lime-600)]'
                        : 'border-line bg-surface hover:bg-panel'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 text-[13px] font-bold text-ink">
                      {title}
                      <span
                        className={`grid size-4 shrink-0 place-items-center rounded-full border ${draft.startMode === startMode ? 'border-ink bg-ink text-lime' : 'border-line'}`}
                      >
                        {draft.startMode === startMode && (
                          <Check aria-hidden="true" className="size-3" />
                        )}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs font-normal text-muted">{description}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {validationError && (
              <p id="profile-form-error" role="alert" className="text-sm font-semibold text-red">
                {validationError}
              </p>
            )}
            {saveError && (
              <Alert variant="danger" role="alert">
                <p>{saveError}</p>
              </Alert>
            )}
            {saved && (
              <p role="status" className="text-sm font-semibold text-green-800">
                Profile updated.
              </p>
            )}

            <div className="flex justify-end border-t border-line pt-4">
              <Button type="submit" isLoading={isSaving}>
                Save profile
              </Button>
            </div>
          </form>
        </Card>

        <aside className="grid gap-4">
          <Card variant="dark" className="p-4 sm:p-[22px]">
            <nav aria-label={mode === 'RUNNER' ? 'Runner tools' : 'Requester tools'}>
              <h2 className="text-base font-extrabold text-white">
                {mode === 'RUNNER' ? 'Runner tools' : 'Requester tools'}
              </h2>
              <p className="mb-4 mt-1 text-xs text-white/70">Shortcuts for your current mode.</p>
              <div className="grid gap-2">
                {mode === 'RUNNER' && (
                  <Link
                    href="/runner/profile"
                    className="group flex min-h-11 items-center gap-3 rounded-xl bg-[#26323f] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#344154] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-reduce:transition-none"
                  >
                    <MapPin aria-hidden="true" className="size-[18px] shrink-0 text-lime" />
                    <span className="min-w-0 flex-1">Runner profile &amp; area</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 text-white/70 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  </Link>
                )}
                {roleLinks.map(({ href, label, icon: Icon, mobileOnly }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`${mobileOnly ? 'lg:hidden ' : ''}group flex min-h-11 items-center gap-3 rounded-xl bg-[#26323f] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#344154] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-reduce:transition-none`}
                  >
                    <Icon aria-hidden="true" className="size-[18px] shrink-0 text-lime" />
                    <span className="min-w-0 flex-1">{label}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 text-white/70 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  </Link>
                ))}
              </div>
            </nav>
          </Card>
          <Card className="border border-line p-4 sm:p-[22px]">
            <nav aria-label="Account and support">
              <h2 className="mb-3 text-sm font-extrabold text-ink">Account &amp; support</h2>
              <div className="-mx-2 grid gap-1">
                {sharedLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex min-h-11 items-center gap-3 rounded-xl px-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-panel focus-visible:outline-2 focus-visible:outline-green-800"
                  >
                    <Icon aria-hidden="true" className="size-[18px] shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">{label}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                ))}
              </div>
            </nav>
          </Card>
          <Stats
            summary={summary.data}
            isLoading={summary.isPending}
            error={summary.error}
            onRetry={() => void summary.refetch()}
            mode={mode}
          />
        </aside>
      </div>
      <MobileSignOut />
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
  const stats =
    mode === 'RUNNER'
      ? ([
          ['Completed in 30 days', summary?.asRunner.completedLast30Days],
          ['Offers this week', summary?.asRunner.offersThisWeek],
          ['Active assignments', summary?.asRunner.activeAssignments],
        ] as const)
      : ([
          ['Errands this month', summary?.asRequester.errandsThisMonth],
          ['Completed this month', summary?.asRequester.completedThisMonth],
          ['Open errands', summary?.asRequester.openErrands],
        ] as const);

  return (
    <section
      aria-label="Profile stats"
      className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]"
    >
      <h2 className="text-sm font-extrabold text-ink">Your activity</h2>
      <p className="mb-2 mt-1 text-xs text-muted">
        {mode === 'RUNNER'
          ? 'Your running activity at a glance.'
          : 'Your requesting activity at a glance.'}
      </p>
      {error ? (
        <Alert variant="danger" role="alert" className="mt-4">
          <p>We could not load your profile stats.</p>
          <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={onRetry}>
            Retry stats
          </Button>
        </Alert>
      ) : (
        <dl className="divide-y divide-line">
          {stats.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-3">
              <dt className="text-xs font-medium text-muted">{label}</dt>
              <dd className="text-xl font-extrabold tracking-tight text-ink">
                {isLoading ? (
                  <Skeleton className="h-7 w-8" aria-label={`Loading ${label}`} />
                ) : (
                  (value ?? '—')
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
