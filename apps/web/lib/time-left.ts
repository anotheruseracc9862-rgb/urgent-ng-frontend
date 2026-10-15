/** Whole minutes until an ISO time, or null when it is missing or already past. */
export function minutesUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const minutes = Math.floor((new Date(iso).getTime() - Date.now()) / 60_000);
  return minutes > 0 ? minutes : null;
}

/** "50 min", "3 h", "23 h 20 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
