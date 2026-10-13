import { describe, it, expect, vi, beforeEach } from 'vitest';
import { track } from './analytics';

describe('Analytics', () => {
  beforeEach(() => {
    // Spy on console.warn
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('allows tracking events in the allow-list', () => {
    expect(() => {
      track('auth.register_started');
      track('errand.create_completed');
      track('offer.accept');
    }).not.toThrow();
  });

  it('drops events not in allow-list', () => {
    track('unauthorized.event');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('not in allow-list')
    );
  });

  it('drops events with sensitive data in properties', () => {
    track('auth.register_started', {
      phone: '08012345678',
    });
    
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('contains sensitive data')
    );
  });

  it('allows events with safe properties', () => {
    expect(() => {
      track('errand.create_completed', {
        category: 'shopping',
        hasImages: true,
        count: 3,
      });
    }).not.toThrow();
  });

  it('blocks multiple sensitive field patterns', () => {
    const sensitiveFields = [
      { email: 'test@example.com' },
      { address: '123 Main St' },
      { location: 'Lagos' },
      { message: 'Hello' },
      { password: 'secret' },
      { userName: 'John' },
    ];

    sensitiveFields.forEach(field => {
      vi.clearAllMocks();
      track('errand.create_started', field);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  it('drops events whose values carry a phone, an email, a link or free text', () => {
    const values = [
      { source: '08031234567' },
      { source: '+234 803 123 4567' },
      { source: 'ada@example.com' },
      { source: 'https://urgent.ng/shared/abc123' },
      { source: 'Please pick up the parcel from 12 Allen Avenue, Ikeja, near the blue gate and call me' },
    ];

    values.forEach((properties) => {
      vi.clearAllMocks();
      track('errand.create_started', properties);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('contains sensitive data'));
    });
  });

  it('keeps short enum-like values', () => {
    track('errand.create_started', { source: 'dashboard', step: 2 });
    expect(console.warn).not.toHaveBeenCalled();
  });
});
