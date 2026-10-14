'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor, Smartphone } from 'lucide-react';
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
    <li className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${session.current ? 'bg-tint text-green-800' : 'bg-panel text-muted'}`}>
        <Monitor className="size-5" aria-hidden="true" />
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
    <li className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${device.active ? 'bg-tint text-green-800' : 'bg-panel text-muted'}`}>
        <Icon className="size-5" aria-hidden="true" />
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
  const revokeSession = useMutation({ mutationFn: authApi.revokeSession, onSuccess: refresh });
  const removeDevice = useMutation({ mutationFn: authApi.removeDevice, onSuccess: refresh });

  if (sessions.isLoading || devices.isLoading) {
    return (
      <div className="mx-auto grid max-w-4xl gap-5">
        <header><Skeleton className="h-4 w-20" /><Skeleton className="mt-2 h-8 w-56" /><Skeleton className="mt-2 h-4 w-full max-w-lg" /></header>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-72 rounded-[var(--r-lg)]" />
          <Skeleton className="h-72 rounded-[var(--r-lg)]" />
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
    <div className="mx-auto grid max-w-4xl gap-5">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-green-700">Account</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Security</h1>
        <p className="mt-1 text-sm text-muted">Manage where you are signed in and devices that can receive notifications.</p>
      </header>

      {errors.map((error, index) => <ErrorPanel key={index} error={error} onRetry={retry} />)}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
          <header className="border-b border-line pb-3">
            <h2 className="text-base font-extrabold text-ink">Signed-in sessions</h2>
            <p className="mt-1 text-xs text-muted">Revoke a session to sign that device out.</p>
          </header>
          {sessions.error && !sessions.data ? (
            <p className="py-5 text-sm text-muted">Signed-in sessions could not be loaded.</p>
          ) : !sessions.data?.length ? (
            <p className="py-5 text-sm text-muted">No signed-in sessions were found.</p>
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
          <p className="border-t border-line pt-3 text-xs leading-relaxed text-muted">This session cannot be revoked here. Use Log out to sign out of this device.</p>
        </section>

        <section className="rounded-[var(--r-lg)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
          <header className="border-b border-line pb-3">
            <h2 className="text-base font-extrabold text-ink">Notification devices</h2>
            <p className="mt-1 text-xs text-muted">Remove a device to stop sending notifications to it.</p>
          </header>
          {devices.error && !devices.data ? (
            <p className="py-5 text-sm text-muted">Notification devices could not be loaded.</p>
          ) : !devices.data?.length ? (
            <p className="py-5 text-sm text-muted">No notification devices are registered. Devices appear here after push notifications are enabled.</p>
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
