import * as React from 'react';

/**
 * One Idempotency-Key per user intent: the same signature keeps the same key across retries,
 * a changed signature or a finished purchase gets a new one.
 */
export function useIntentKey() {
  const ref = React.useRef<{ signature: string; key: string } | null>(null);
  return {
    keyFor(signature: string): string {
      if (ref.current?.signature !== signature) {
        ref.current = { signature, key: crypto.randomUUID() };
      }
      return ref.current.key;
    },
    reset(): void {
      ref.current = null;
    },
  };
}
