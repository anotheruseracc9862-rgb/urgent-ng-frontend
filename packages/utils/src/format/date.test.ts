import { describe, expect, it } from 'vitest';
import { formatLagosDateTimeParts, parseLagosDateTime } from './date';

describe('parseLagosDateTime()', () => {
  it('converts Lagos wall time (UTC+1) to an ISO UTC timestamp', () => {
    expect(parseLagosDateTime('2026-10-13', '18:30')).toBe('2026-10-13T17:30:00.000Z');
    expect(parseLagosDateTime('2026-01-01', '00:15')).toBe('2025-12-31T23:15:00.000Z');
    expect(parseLagosDateTime('2024-02-29', '12:00')).toBe('2024-02-29T11:00:00.000Z');
  });

  it('rejects malformed and impossible dates or times', () => {
    for (const [date, time] of [
      ['13/10/2026', '18:30'],
      ['2025-02-29', '18:30'],
      ['2026-10-13', '24:00'],
      ['2026-10-13', '10:60'],
      ['2026-10-13', 'bad'],
    ]) {
      expect(() => parseLagosDateTime(date!, time!)).toThrow(RangeError);
    }
  });
});

describe('formatLagosDateTimeParts()', () => {
  it('converts an ISO UTC timestamp to Africa/Lagos input values', () => {
    expect(formatLagosDateTimeParts('2026-10-13T17:30:00.000Z')).toEqual({
      date: '2026-10-13',
      time: '18:30',
    });
  });

  it('returns null for invalid timestamps', () => {
    expect(formatLagosDateTimeParts('invalid')).toBeNull();
  });
});
