/**
 * Format date/time for Lagos timezone (Africa/Lagos)
 */

const LAGOS_TZ = 'Africa/Lagos';

/**
 * Format date in Lagos timezone
 * @param date - Date string or Date object
 * @param format - 'short' | 'medium' | 'long' | 'time'
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'medium' | 'long' | 'time' = 'medium'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'time') {
    return new Intl.DateTimeFormat('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: LAGOS_TZ,
    }).format(d);
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: LAGOS_TZ,
  };

  switch (format) {
    case 'short':
      options.day = '2-digit';
      options.month = 'short';
      options.year = 'numeric';
      break;
    case 'medium':
      options.day = 'numeric';
      options.month = 'short';
      options.year = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'long':
      options.weekday = 'short';
      options.day = 'numeric';
      options.month = 'long';
      options.year = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
  }

  return new Intl.DateTimeFormat('en-NG', options).format(d);
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 5 minutes")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.abs(Math.floor(diffMs / 1000));
  const isPast = diffMs < 0;

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (diffSec < 60) {
    return rtf.format(isPast ? -diffSec : diffSec, 'second');
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return rtf.format(isPast ? -diffMin : diffMin, 'minute');
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return rtf.format(isPast ? -diffHour : diffHour, 'hour');
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    return rtf.format(isPast ? -diffDay : diffDay, 'day');
  }

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) {
    return rtf.format(isPast ? -diffWeek : diffWeek, 'week');
  }

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    return rtf.format(isPast ? -diffMonth : diffMonth, 'month');
  }

  const diffYear = Math.floor(diffDay / 365);
  return rtf.format(isPast ? -diffYear : diffYear, 'year');
}

/** Parse an HTML date/time input in Africa/Lagos (UTC+1) into ISO UTC. */
export function parseLagosDateTime(dateStr: string, timeStr?: string): string {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const timeParts = /^(\d{2}):(\d{2})$/.exec(timeStr ?? '00:00');
  if (!dateParts || !timeParts) throw new RangeError('Enter a valid Lagos date and time.');

  const [, yearText, monthText, dayText] = dateParts;
  const [, hourText, minuteText] = timeParts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59) {
    throw new RangeError('Enter a valid Lagos date and time.');
  }

  const localTime = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    localTime.getUTCFullYear() !== year ||
    localTime.getUTCMonth() !== month - 1 ||
    localTime.getUTCDate() !== day
  ) {
    throw new RangeError('Enter a valid Lagos date and time.');
  }

  return new Date(localTime.getTime() - 60 * 60 * 1000).toISOString();
}

/** Convert an ISO UTC value back to the date/time values shown in Lagos. */
export function formatLagosDateTimeParts(iso: string): { date: string; time: string } | null {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return null;
  const lagos = new Date(timestamp + 60 * 60 * 1000).toISOString();
  return { date: lagos.slice(0, 10), time: lagos.slice(11, 16) };
}
