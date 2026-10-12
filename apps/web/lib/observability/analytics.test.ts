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
});
