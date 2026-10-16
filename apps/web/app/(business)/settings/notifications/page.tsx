import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { api, isApiError } from '@/lib/api/client';
import { Alert } from '@urgent/ui';
import { NotificationPreferencesForm } from '@/features/settings/notification-preferences-form';
import type {
  NotificationPreference,
  QuietHours,
} from '@/features/settings/notification-preferences-form';

export const metadata = {
  title: 'Notification Settings — Urgent.ng',
};

async function cookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

export default async function NotificationSettingsPage() {
  const me = await getSession();
  if (!me) return null;

  let preferences: NotificationPreference[];
  let quietHours: QuietHours;

  try {
    const cookie = await cookieHeader();
    [preferences, quietHours] = await Promise.all([
      api<NotificationPreference[]>('/me/notification-preferences', { cookie }),
      api<QuietHours>('/me/quiet-hours', {
        cookie,
      }),
    ]);
  } catch (error) {
    const isForbidden = isApiError(error) && error.status === 403;
    const requestId = isApiError(error) ? error.requestId : undefined;

    return (
      <section className="mx-auto grid max-w-2xl gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Notification settings
        </h1>
        <Alert variant="danger" role="alert">
          <div className="grid gap-2">
            <p>
              {isForbidden
                ? 'You do not have permission to view these settings.'
                : 'We could not load your notification settings. Please try again.'}
            </p>
            {requestId && <p className="text-xs">Request ID: {requestId}</p>}
            <Link className="font-bold underline" href="/settings/notifications">
              Try again
            </Link>
          </div>
        </Alert>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <header className="px-1.5 pt-1">
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-green-700">Account</p>
        <h1 className="text-[clamp(24px,3vw,32px)] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">Notification settings</h1>
        <p className="mt-1.5 max-w-[620px] text-sm text-muted">Choose what reaches you and how. Safety and account notices are always on.</p>
      </header>
      <NotificationPreferencesForm
        initialPreferences={preferences}
        initialQuietHours={quietHours}
      />
    </div>
  );
}
