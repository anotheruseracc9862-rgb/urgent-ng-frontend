'use client';

import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import type { components } from '@urgent/api-client';
import { Alert, Button, Switch } from '@urgent/ui';
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
  {
    id: 'SAFETY',
    label: 'Safety and account',
    description: 'Important safety and account notices',
    mandatory: true,
  },
  {
    id: 'TRANSACTIONAL',
    label: 'Errand updates',
    description: 'Progress and account notices',
    mandatory: true,
  },
  { id: 'MESSAGING', label: 'Messages', description: 'New messages', mandatory: false },
  {
    id: 'MARKETPLACE',
    label: 'Nearby errands',
    description: 'Offers and errands near you',
    mandatory: false,
  },
  {
    id: 'MARKETING',
    label: 'Tips and offers',
    description: 'Product news and promotions',
    mandatory: false,
  },
];

function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === 'VALIDATION_ERROR') return 'Check the notification settings and try again.';
    if (error.code === 'AUTH_REQUIRED')
      return 'Your session has expired. Sign in again to save these settings.';
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
    <form
      className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]"
      onSubmit={saveSettings}
    >
      <section
        aria-labelledby="notification-categories-heading"
        className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]"
      >
        <h2 id="notification-categories-heading" className="text-base font-extrabold text-ink">
          By category
        </h2>
        <div
          role="region"
          aria-label="Notification delivery channels"
          className="relative mt-4 overflow-x-auto rounded-[var(--r-sm)]"
        >
          <table className="w-full table-fixed border-collapse text-[13px] sm:table-auto">
            <thead>
              <tr className="text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
                <th scope="col" className="px-1 pb-2.5 text-left sm:px-3">
                  Category
                </th>
                {CHANNELS.map((channel) => (
                  <th
                    scope="col"
                    key={channel.id}
                    className="w-[54px] px-1 pb-2.5 text-center whitespace-nowrap sm:w-auto sm:px-3"
                  >
                    {channel.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((category) => (
                <tr
                  key={category.id}
                  className="border-t border-line-2 transition-colors hover:bg-panel motion-reduce:transition-none"
                >
                  <th scope="row" className="px-1 py-3.5 text-left font-normal sm:px-3">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                      {category.label}
                      {category.mandatory ? (
                        <LockKeyhole aria-hidden="true" className="size-3 shrink-0 text-muted" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      {category.mandatory ? 'Always on' : category.description}
                    </span>
                  </th>
                  {CHANNELS.map((channel) => {
                    const preference = preferences.find(
                      (entry) => entry.category === category.id && entry.channel === channel.id,
                    );
                    const label = `${channel.label} notifications for ${category.label}`;
                    return (
                      <td key={channel.id} className="px-1 py-3.5 text-center sm:px-3">
                        {category.mandatory ? (
                          <>
                            <input
                              type="checkbox"
                              checked
                              disabled
                              aria-label={label}
                              className="sr-only"
                            />
                            <span aria-hidden="true" className="text-ink-2">
                              On
                            </span>
                          </>
                        ) : (
                          <Switch
                            role="checkbox"
                            checked={preference?.enabled === true}
                            disabled={isSaving}
                            aria-label={label}
                            onCheckedChange={(enabled) =>
                              updatePreference(category.id, channel.id, enabled)
                            }
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid min-w-0 gap-4">
        <section
          aria-labelledby="quiet-hours-heading"
          className="rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="quiet-hours-heading" className="text-base font-extrabold text-ink">
                Quiet hours
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Marketplace push notices are held until quiet hours end. Safety and account notices
                still come through.
              </p>
            </div>
            <label className="grid shrink-0 justify-items-center text-[11px] font-semibold text-muted">
              <Switch
                role="checkbox"
                checked={useCustomQuietHours}
                disabled={isSaving}
                aria-label="Use custom quiet hours"
                onCheckedChange={(enabled) => {
                  setUseCustomQuietHours(enabled);
                  setSaved(false);
                }}
              />
              Custom
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">
            {useCustomQuietHours
              ? 'Times are in Lagos time.'
              : quietHours.isDefault
                ? `Using the default quiet window: ${quietHours.start} to ${quietHours.end} Lagos time.`
                : 'The default quiet window will be restored when you save. Times are in Lagos time.'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="grid min-w-0 gap-1.5 text-[12.5px] font-bold text-ink-2">
              From
              <input
                type="time"
                value={quietStart}
                disabled={!useCustomQuietHours || isSaving}
                onChange={(event) => {
                  setQuietStart(event.currentTarget.value);
                  setSaved(false);
                }}
                required={useCustomQuietHours}
                className="min-h-12 w-full min-w-0 rounded-[var(--r-sm)] border border-line bg-surface px-4 text-sm font-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 disabled:bg-panel disabled:text-muted"
              />
            </label>
            <label className="grid min-w-0 gap-1.5 text-[12.5px] font-bold text-ink-2">
              To
              <input
                type="time"
                value={quietEnd}
                disabled={!useCustomQuietHours || isSaving}
                onChange={(event) => {
                  setQuietEnd(event.currentTarget.value);
                  setSaved(false);
                }}
                required={useCustomQuietHours}
                className="min-h-12 w-full min-w-0 rounded-[var(--r-sm)] border border-line bg-surface px-4 text-sm font-normal text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 disabled:bg-panel disabled:text-muted"
              />
            </label>
          </div>
        </section>
        <Button
          className="min-h-[52px] w-full shadow-none hover:translate-y-0 hover:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Saving…' : 'Save settings'}
        </Button>
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
      </div>
    </form>
  );
}
