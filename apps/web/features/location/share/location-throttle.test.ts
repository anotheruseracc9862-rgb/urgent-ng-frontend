import { describe, expect, it } from 'vitest';
import { distanceMeters, shouldSendLocation } from './location-throttle';

describe('runner location update throttle', () => {
  it('sends an initial position, then requires both 30 seconds and 100 metres', () => {
    const first = { lat: 6.5244, lng: 3.3792, sentAt: 1_000 };
    expect(shouldSendLocation(null, first, 1_000)).toBe(true);
    expect(shouldSendLocation(first, { lat: 6.5249, lng: 3.3792 }, 31_000)).toBe(false);
    expect(shouldSendLocation(first, { lat: 6.5260, lng: 3.3792 }, 30_999)).toBe(false);
    expect(shouldSendLocation(first, { lat: 6.5260, lng: 3.3792 }, 31_000)).toBe(true);
  });

  it('allows a report after the interval when the runner moved at least 100 metres', () => {
    const first = { lat: 6.5244, lng: 3.3792, sentAt: 1_000 };
    const moved = { lat: 6.5260, lng: 3.3792 };
    expect(distanceMeters(first, moved)).toBeGreaterThanOrEqual(100);
    expect(shouldSendLocation(first, moved, 31_000)).toBe(true);
  });
});
