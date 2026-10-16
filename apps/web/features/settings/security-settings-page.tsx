'use client';

import { PageHead } from '@/components/shell/page-head';
import { useApiMutation } from '@/lib/query/mutations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Monitor, ShieldCheck, Smartphone } from 'lucide-react';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import type { LoginSession, RegisteredDevice } from '@/lib/api/types';
import { useSession } from '@/lib/auth/client';
import { queryKeys } from '@/lib/query/keys';

function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const requestId = isApiError(error) ? error.requestId : undefined;
  const forbidden = isApiError(error) && error.status === 403;
  return (
    <Alert variant="danger" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p>{forbidden ? 'You do not have permission to view security settings.' : 'We could not load or update your security settings.'}</p>
          {requestId ? <p className="mt-1 text-xs">Request ID: {requestId}</p> : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    </Alert>
  );
}

function SessionRow({ session, busy, onRevoke }: {
  session: LoginSession;
  busy: boolean;
  onRevoke: (sessionId: string) => void;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-3 border-t border-line-2 px-1 py-4 first:border-0 sm:flex-row sm:items-center">
      <span className={`grid size-10 shrink-0 place-items-center rounded-[13px] ${session.current ? 'bg-tint-2 text-green-900' : 'bg-panel text-muted'}`}>
        <Monitor className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words text-sm font-extrabold text-ink">
            {session.userAgent || 'Browser or device details unavailable'}
          </h3>
          {session.current ? (
            <span className="rounded-full bg-ok-bg px-2.5 py-1 text-[10px] font-extrabold text-ok">This session</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted">
          Signed in {formatDate(session.startedAt, 'short')} · Last active {formatDate(session.lastRefreshedAt, 'short')}
        </p>
      </div>
      {!session.current ? (
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onRevoke(session.id)}>
          {busy ? 'Revoking…' : 'Revoke'}
        </Button>
      ) : null}
    </li>
  );
}

function DeviceRow({ device, busy, onRemove }: {
  device: RegisteredDevice;
  busy: boolean;
  onRemove: (deviceId: string) => void;
}) {
  const isMobile = device.type === 'MOBILE_PUSH';
  const Icon = isMobile ? Smartphone : Monitor;
  return (
    <li className="flex min-w-0 flex-col gap-3 border-t border-line-2 px-1 py-4 first:border-0 sm:flex-row sm:items-center">
      <span className={`grid size-10 shrink-0 place-items-center rounded-[13px] ${device.active ? 'bg-tint-2 text-green-900' : 'bg-panel text-muted'}`}>
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-extrabold text-ink">{isMobile ? 'Mobile device' : 'Web browser'}</h3>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${device.active ? 'bg-ok-bg text-ok' : 'bg-panel text-muted'}`}>
            {device.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Last seen {device.lastSeenAt ? formatDate(device.lastSeenAt, 'short') : 'Not seen yet'}
        </p>
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onRemove(device.id)}>
        {busy ? 'Removing…' : 'Remove'}
      </Button>
    </li>
  );
}

export function SecuritySettingsPage() {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const sessionsKey = queryKeys.security.sessions(me.id);
  const devicesKey = queryKeys.security.devices(me.id);
  const sessions = useQuery({ queryKey: sessionsKey, queryFn: authApi.sessions });
  const devices = useQuery({ queryKey: devicesKey, queryFn: authApi.devices });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: sessionsKey }),
    queryClient.invalidateQueries({ queryKey: devicesKey }),
  ]);
  const revokeSession = useApiMutation({ affects: ['security'], mutationFn: authApi.revokeSession, onSuccess: refresh });
  const removeDevice = useApiMutation({ affects: ['security'], mutationFn: authApi.removeDevice, onSuccess: refresh });

  if (sessions.isPending || devices.isPending) {
    return (
      <div className="grid min-w-0 content-start gap-4 pb-10" aria-busy="true">
        <PageHead
          eyebrow="Account"
          title="Security"
          description="Manage where you are signed in and devices that can receive notifications."
        />
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {[0, 1].map((card) => (
            <section key={card} aria-label={card === 0 ? 'Loading signed-in sessions' : 'Loading notification devices'} className="grid gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 shrink-0 rounded-[13px]" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
              </div>
              {[0, 1].map((row) => (
                <div key={row} className="flex items-center gap-3 border-t border-line-2 px-1 py-4 first:border-0">
                  <Skeleton className="size-10 shrink-0 rounded-[13px]" />
                  <div className="grid min-w-0 flex-1 gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                  <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    );
  }

  const errors = [sessions.error, devices.error, revokeSession.error, removeDevice.error].filter(Boolean);
  const retry = () => {
    revokeSession.reset();
    removeDevice.reset();
    void sessions.refetch();
    void devices.refetch();
  };

  return (
    <div className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Account"
        title="Security"
        description="Manage where you are signed in and devices that can receive notifications."
      />

      {errors.map((error, index) => <ErrorPanel key={index} error={error} onRetry={retry} />)}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section aria-labelledby="security-sessions-heading" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <header className="mb-2 flex items-start gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-tint-2 text-green-900">
              <ShieldCheck className="size-[18px]" />
            </span>
            <div>
              <h2 id="security-sessions-heading" className="text-base font-extrabold tracking-tight text-ink">Signed-in sessions</h2>
              <p className="mt-1 text-xs leading-5 text-muted">Revoke a session to sign that device out.</p>
            </div>
          </header>
          {sessions.error && !sessions.data ? (
            <p className="px-1 py-5 text-sm text-muted">Signed-in sessions could not be loaded.</p>
          ) : !sessions.data?.length ? (
            <div className="grid justify-items-center gap-2 px-4 py-8 text-center" role="status">
              <span aria-hidden="true" className="grid size-12 place-items-center rounded-[16px] bg-panel text-ink-2"><Monitor className="size-5" /></span>
              <p className="text-sm font-bold text-ink">No signed-in sessions were found</p>
            </div>
          ) : (
            <ul aria-label="Signed-in sessions">
              {sessions.data.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  busy={revokeSession.isPending}
                  onRevoke={(id) => revokeSession.mutate(id)}
                />
              ))}
            </ul>
          )}
          <p className="mt-1 border-t border-line-2 px-1 pt-3 text-xs leading-relaxed text-muted">This session cannot be revoked here. Use Log out to sign out of this device.</p>
        </section>

        <section aria-labelledby="security-devices-heading" className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
          <header className="mb-2 flex items-start gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-blue-bg text-blue">
              <Bell className="size-[18px]" />
            </span>
            <div>
              <h2 id="security-devices-heading" className="text-base font-extrabold tracking-tight text-ink">Notification devices</h2>
              <p className="mt-1 text-xs leading-5 text-muted">Remove a device to stop sending notifications to it.</p>
            </div>
          </header>
          {devices.error && !devices.data ? (
            <p className="px-1 py-5 text-sm text-muted">Notification devices could not be loaded.</p>
          ) : !devices.data?.length ? (
            <div className="grid justify-items-center gap-2 px-4 py-8 text-center" role="status">
              <span aria-hidden="true" className="grid size-12 place-items-center rounded-[16px] bg-panel text-ink-2"><Bell className="size-5" /></span>
              <p className="max-w-sm text-sm font-bold text-ink">No notification devices are registered</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted">Devices appear here after push notifications are enabled.</p>
            </div>
          ) : (
            <ul aria-label="Notification devices">
              {devices.data.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  busy={removeDevice.isPending}
                  onRemove={(id) => removeDevice.mutate(id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
