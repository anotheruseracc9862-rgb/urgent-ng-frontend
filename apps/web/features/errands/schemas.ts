export const SCHEDULE_MIN_LEAD_HOURS = 1;
export const SCHEDULE_MAX_DAYS_AHEAD = 7;

export function isScheduledTimeInRange(value: string | null, now = new Date()): boolean {
  if (!value) return false;
  const scheduled = new Date(value).getTime();
  const current = now.getTime();
  return Number.isFinite(scheduled)
    && scheduled >= current + SCHEDULE_MIN_LEAD_HOURS * 60 * 60 * 1000
    && scheduled <= current + SCHEDULE_MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
}
