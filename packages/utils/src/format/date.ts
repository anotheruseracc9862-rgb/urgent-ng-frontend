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

/**
 * Parse Lagos date/time input to ISO string
 * @param dateStr - Date string in local format
 * @param timeStr - Optional time string
 * @returns ISO 8601 string in UTC
 */
export function parseLagosDateTime(dateStr: string, timeStr?: string): string {
  const combined = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  
  // Parse as Lagos time
  const date = new Date(combined);
  
  // Convert to UTC for API
  return date.toISOString();
}
