'use client';

import { useSyncExternalStore } from 'react';
import { readPendingIdentifier, readPendingVerify, subscribePending, type PendingVerify } from './pending-identity';

/** `undefined` during hydration, then the value or `null`, like a storage read without the mismatch. */
export function usePendingVerify(): PendingVerify | null | undefined {
  return useSyncExternalStore(subscribePending, readPendingVerify, () => undefined);
}

export function usePendingIdentifier(): string | null | undefined {
  return useSyncExternalStore(subscribePending, readPendingIdentifier, () => undefined);
}
