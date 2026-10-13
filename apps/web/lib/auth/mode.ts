export type AppMode = 'REQUESTER' | 'RUNNER';

/** Remembers the shell mode across reloads. The server layout reads it (`ung_mode`). */
export function saveMode(mode: AppMode): void {
  document.cookie = `ung_mode=${mode}; path=/; max-age=31536000; samesite=lax`;
}
