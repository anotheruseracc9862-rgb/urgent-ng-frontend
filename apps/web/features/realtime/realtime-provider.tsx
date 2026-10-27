'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { api } from '@/lib/api/client';
import { onSessionCleared } from '@/lib/auth/session-events';
import { invalidateRealtimeEvent } from './event-dispatcher';

export type RealtimeStatus = 'connecting' | 'live' | 'degraded' | 'offline';

interface RealtimeContextValue {
  status: RealtimeStatus;
}

// The stream goes straight to the API, not through the web app's /api/v1 rewrite: a proxy hop keeps a
// dead connection looking open to the server, so slots never free. Cookies do not cross origins, so
// every connection authenticates with a one-time ticket.
const EVENTS_URL = `${(process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '') || '/api/v1'}/events`;

const RealtimeContext = React.createContext<RealtimeContextValue>({ status: 'connecting' });

interface RealtimeEnvelope {
  id?: string;
  type: string;
  data?: Record<string, unknown>;
}

function isRealtimeEnvelope(value: unknown): value is RealtimeEnvelope {
  return typeof value === 'object' && value !== null && 'type' in value &&
    typeof value.type === 'string';
}

export function RealtimeProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<RealtimeStatus>('connecting');

  React.useEffect(() => {
    let stopped = false;
    let source: EventSource | undefined;
    let timer: number | undefined;
    let fallbackTimer: number | undefined;
    let retry = 0;
    let lastEventId = '';
    let useTicket = true;
    let wasDown = false;
    const seen = new Set<string>();

    const setOfflineState = () => {
      if (!navigator.onLine) {
        source?.close();
        if (timer !== undefined) window.clearTimeout(timer);
        if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
        wasDown = true;
        setStatus('offline');
      } else if (!stopped) {
        if (timer !== undefined) window.clearTimeout(timer);
        retry = 0;
        void connect(useTicket);
      }
    };

    const receive = (raw: string, eventId?: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        setStatus('degraded');
        return;
      }
      if (!isRealtimeEnvelope(parsed)) {
        setStatus('degraded');
        return;
      }

      const id = parsed.id ?? eventId;
      if (id) {
        if (seen.has(id)) return;
        seen.add(id);
        lastEventId = id;
        if (seen.size > 500) seen.delete(seen.values().next().value as string);
      }
      void invalidateRealtimeEvent(queryClient, parsed.type);
    };

    const scheduleReconnect = () => {
      if (stopped || !navigator.onLine) {
        setStatus('offline');
        return;
      }
      source?.close();
      useTicket = true;
      wasDown = true;
      setStatus('degraded');
      if (fallbackTimer === undefined) {
        fallbackTimer = window.setInterval(() => {
          void queryClient.invalidateQueries();
        }, 30_000);
      }
      const base = Math.min(1000 * 2 ** retry, 30_000);
      retry += 1;
      const delay = Math.round(base * (0.75 + Math.random() * 0.5));
      timer = window.setTimeout(() => void connect(true), delay);
    };

    const connect = async (ticketMode: boolean) => {
      if (stopped) return;
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }
      setStatus(retry === 0 ? 'connecting' : 'degraded');
      let url = EVENTS_URL;
      try {
        const query = new URLSearchParams();
        if (ticketMode) {
          const ticket = await api<components['schemas']['EventTicketDto']>('/events/ticket', {
            method: 'POST',
            body: {},
          });
          query.set('ticket', ticket.ticket);
        }
        if (lastEventId) query.set('lastEventId', lastEventId);
        const suffix = query.toString();
        if (suffix) url += `?${suffix}`;

        if (stopped) return;
        source = new EventSource(url);
        source.onopen = () => {
          retry = 0;
          useTicket = ticketMode;
          if (fallbackTimer !== undefined) {
            window.clearInterval(fallbackTimer);
            fallbackTimer = undefined;
          }
          setStatus('live');
          if (wasDown) {
            // Events during the outage may be gone: refetch instead of trusting the stream.
            wasDown = false;
            void queryClient.invalidateQueries();
          }
        };
        source.onmessage = (event) => receive(event.data, event.lastEventId);
        source.addEventListener('resync', (event) => {
          if (event instanceof MessageEvent) receive(event.data, event.lastEventId);
          void queryClient.invalidateQueries();
        });
        source.addEventListener('error', (event) => {
          // A plain connection error is handled by scheduleReconnect: refetching every query here
          // made each failed retry a request burst. Only a server-sent error frame refetches.
          if (event instanceof MessageEvent) {
            receive(event.data, event.lastEventId);
            void queryClient.invalidateQueries();
          }
        });
        source.onerror = scheduleReconnect;
      } catch {
        scheduleReconnect();
      }
    };

    const unregister = onSessionCleared(() => {
      stopped = true;
      source?.close();
      if (timer !== undefined) window.clearTimeout(timer);
      if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
      setStatus('offline');
    });
    window.addEventListener('online', setOfflineState);
    window.addEventListener('offline', setOfflineState);
    void connect(true);

    return () => {
      stopped = true;
      unregister();
      source?.close();
      if (timer !== undefined) window.clearTimeout(timer);
      if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
      window.removeEventListener('online', setOfflineState);
      window.removeEventListener('offline', setOfflineState);
    };
  }, [queryClient, userId]);

  return (
    <RealtimeContext.Provider value={{ status }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeStatus(): RealtimeStatus {
  return React.useContext(RealtimeContext).status;
}
