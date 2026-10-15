import * as React from 'react';

const subscribe = () => () => {};

/**
 * False while the server renders and during the first client render, so markup that depends on
 * client-only state (a warm query cache, storage) matches the server HTML, then true.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(subscribe, () => true, () => false);
}
