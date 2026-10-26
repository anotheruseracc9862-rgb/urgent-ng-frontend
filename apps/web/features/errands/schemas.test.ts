import { describe, expect, it } from 'vitest';
import { isScheduledTimeInRange } from './schemas';

describe('scheduled errand time bounds', () => {
  const now = new Date('2026-10-13T10:00:00.000Z');

  it('accepts the exact minimum and maximum allowed times', () => {
    expect(isScheduledTimeInRange('2026-10-13T11:00:00.000Z', now)).toBe(true);
    expect(isScheduledTimeInRange('2026-10-20T10:00:00.000Z', now)).toBe(true);
  });

  it('rejects missing, invalid, too-soon, and too-distant times', () => {
    expect(isScheduledTimeInRange(null, now)).toBe(false);
    expect(isScheduledTimeInRange('not-a-date', now)).toBe(false);
    expect(isScheduledTimeInRange('2026-10-13T10:59:59.999Z', now)).toBe(false);
    expect(isScheduledTimeInRange('2026-10-20T10:00:00.001Z', now)).toBe(false);
  });
});
