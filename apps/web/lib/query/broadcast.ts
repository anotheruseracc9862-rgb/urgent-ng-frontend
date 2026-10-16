import type { QueryClient } from '@tanstack/react-query';
import { DOMAINS, invalidateDomains, type Domain } from './domains';

const CHANNEL = 'urgent-cache';

let channel: BroadcastChannel | null | undefined;

function open(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  try {
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
  } catch {
    channel = null;
  }
  return channel;
}

/** Tell the other tabs of this browser that these domains changed. No payload: only domain names. */
export function broadcastInvalidation(domains: readonly Domain[]): void {
  try {
    open()?.postMessage({ type: 'invalidate', domains });
  } catch {
    // A tab that cannot be told will refresh on focus.
  }
}

/** Ask the other tabs to drop their cache (sign-out, or another account signing in). */
export function broadcastClear(): void {
  try {
    open()?.postMessage({ type: 'clear' });
  } catch {
    // Nothing to do.
  }
}

/** Listen for the other tabs. Returns an unsubscribe function. */
export function listenForOtherTabs(client: QueryClient, onClear: () => void): () => void {
  const target = open();
  if (!target) return () => {};
  const handler = (event: MessageEvent) => {
    const message = event.data as { type?: string; domains?: unknown } | null;
    if (message?.type === 'clear') {
      onClear();
      return;
    }
    if (message?.type === 'invalidate' && Array.isArray(message.domains)) {
      const known = message.domains.filter((value): value is Domain => (DOMAINS as readonly string[]).includes(String(value)));
      // Only the named domains: do not echo the message back to the sender.
      void invalidateDomains(client, known);
    }
  };
  target.addEventListener('message', handler);
  return () => target.removeEventListener('message', handler);
}
