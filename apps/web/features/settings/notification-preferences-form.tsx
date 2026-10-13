'use client';

import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import type { components } from '@urgent/api-client';
import { Alert, Button } from '@urgent/ui';
import { api, isApiError } from '@/lib/api/client';

type NotificationCategory = components['schemas']['NotificationCategory'];
type NotificationChannel = components['schemas']['NotificationChannel'];
export type NotificationPreference = components['schemas']['PreferenceEntryViewDto'];
export type QuietHours = components['schemas']['QuietHoursViewDto'];

const CHANNELS: { id: NotificationChannel; label: string }[] = [
  { id: 'IN_APP', label: 'In app' },
  { id: 'PUSH', label: 'Push' },
  { id: 'EMAIL', label: 'Email' },
];

const CATEGORIES: {
  id: NotificationCategory;
  label: string;
  description: string;
  mandatory: boolean;
}[] = [
  { id: 'TRANSACTIONAL', label: 'Errand updates', description: 'Progress and account notices', mandatory: true },
  { id: 'SAFETY', label: 'Safety and account', description: 'Important safety and account notices', mandatory: true },
  { id: 'MARKETPLACE', label: 'Nearby errands', description: 'Offers and errands near you', mandatory: false },
  { id: 'MESSAGING', label: 'Messages', description: 'New messages', mandatory: false },
  { id: 'MARKETING', label: 'Tips and offers', description: 'Product news and promotions', mandatory: false },
];

function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === 'VALIDATION_ERROR') return 'Check the notification settings and try again.';
    if (error.code === 'AUTH_REQUIRED') return 'Your session has expired. Sign in again to save these settings.';
    if (error.requestId) return `We could not save your settings. Request ID: ${error.requestId}`;
  }
  return 'We could not save your settings. Please try again.';
}

export function NotificationPreferencesForm({
  initialPreferences,
  initialQuietHours,
}: {
  initialPreferences: NotificationPreference[];
  initialQuietHours: QuietHours;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [quietHours, setQuietHours] = useState(initialQuietHours);
  const [useCustomQuietHours, setUseCustomQuietHours] = useState(!initialQuietHours.isDefault);
  const [quietStart, setQuietStart] = useState(initialQuietHours.start);
  const [quietEnd, setQuietEnd] = useState(initialQuietHours.end);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessageState] = useState('');
  const [saved, setSaved] = useState(false);

  function updatePreference(
    category: NotificationCategory,
    channel: NotificationChannel,
    enabled: boolean,
  ) {
    setPreferences((current) =>
      current.map((entry) =>
        entry.category === category && entry.channel === channel ? { ...entry, enabled } : entry,
      ),
    );
    setSaved(false);
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessageState('');
    setSaved(false);

    if (useCustomQuietHours && quietStart === quietEnd) {
      setErrorMessageState('Quiet hours must start and end at different times.');
      return;
    }

    setIsSaving(true);
    try {
      const preferencesBody: components['schemas']['UpdatePreferencesDto'] = { preferences };
      const quietHoursBody: components['schemas']['QuietHoursDto'] = useCustomQuietHours
        ? { start: quietStart, end: quietEnd }
        : { start: null, end: null };
      const [updatedPreferences, updatedQuietHours] = await Promise.all([
        api<NotificationPreference[]>('/me/notification-preferences', {
          method: 'PUT',
          body: preferencesBody,
        }),
        api<QuietHours>('/me/quiet-hours', {
          method: 'PUT',
          body: quietHoursBody,
        }),
      ]);

      setPreferences(updatedPreferences);
      setQuietHours(updatedQuietHours);
      setQuietStart(updatedQuietHours.start);
      setQuietEnd(updatedQuietHours.end);
      setUseCustomQuietHours(!updatedQuietHours.isDefault);
      setSaved(true);
    } catch (error) {
      setErrorMessageState(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={saveSettings}>
      <section className="rounded-[var(--r)] border border-line bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-extrabold">By category</h2>
        <p className="mt-1 text-sm text-muted">Safety and account notices are always on.</p>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_repeat(3,56px)] items-center gap-x-2 gap-y-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,72px)]">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Category</span>
          {CHANNELS.map((channel) => (
            <span key={channel.id} className="text-center text-xs font-bold text-muted">
              {channel.label}
            </span>
          ))}

          {CATEGORIES.map((category) => (
            <div key={category.id} className="col-span-4 grid grid-cols-subgrid items-center gap-x-2 border-t border-line py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  {category.label}
                  {category.mandatory && (
                    <LockKeyhole aria-label="Required notifications" className="size-3.5 shrink-0 text-muted" />
                  )}
                </div>
                <p className="text-xs leading-5 text-muted">
                  {category.mandatory ? 'Always on' : category.description}
                </p>
              </div>
              {CHANNELS.map((channel) => {
                const preference = preferences.find(
                  (entry) => entry.category === category.id && entry.channel === channel.id,
                );
                const enabled = category.mandatory || preference?.enabled === true;

                return (
                  <label key={channel.id} className="flex min-h-11 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={category.mandatory || isSaving}
                      aria-label={`${channel.label} notifications for ${category.label}`}
                      onChange={(event) =>
                        updatePreference(category.id, channel.id, event.currentTarget.checked)
                      }
                      className="size-5 accent-green-700 disabled:cursor-not-allowed"
                    />
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--r)] border border-line bg-surface p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold">Quiet hours</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Marketplace push notices are held until quiet hours end. Safety and account notices still come through.
            </p>
          </div>
          <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={useCustomQuietHours}
              disabled={isSaving}
              aria-label="Use custom quiet hours"
              onChange={(event) => {
                setUseCustomQuietHours(event.currentTarget.checked);
                setSaved(false);
              }}
              className="size-5 accent-green-700"
            />
            Custom
          </label>
        </div>
        <p className="mt-3 text-xs text-muted">
          {useCustomQuietHours
            ? 'Times are in Lagos time.'
            : `Using the default quiet window: ${quietHours.start} to ${quietHours.end} Lagos time.`}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-sm font-semibold">
            From
            <input
              type="time"
              value={quietStart}
              disabled={!useCustomQuietHours || isSaving}
              onChange={(event) => {
                setQuietStart(event.currentTarget.value);
                setSaved(false);
              }}
              className="min-h-11 rounded-xl border border-line bg-surface px-3 text-ink disabled:bg-panel disabled:text-muted"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            To
            <input
              type="time"
              value={quietEnd}
              disabled={!useCustomQuietHours || isSaving}
              onChange={(event) => {
                setQuietEnd(event.currentTarget.value);
                setSaved(false);
              }}
              className="min-h-11 rounded-xl border border-line bg-surface px-3 text-ink disabled:bg-panel disabled:text-muted"
            />
          </label>
        </div>
      </section>

      {errorMessage && (
        <Alert variant="danger" role="alert">
          {errorMessage}
        </Alert>
      )}
      {saved && (
        <Alert variant="ok" role="status">
          Notification settings saved.
        </Alert>
      )}
      <Button className="w-full sm:w-auto sm:justify-self-end" disabled={isSaving} type="submit">
        {isSaving ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  );
}
