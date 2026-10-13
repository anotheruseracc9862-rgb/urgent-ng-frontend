import { describe, it, expect } from 'vitest';
import { formatPhone, normalizePhone, isValidPhone } from './phone';

describe('formatPhone', () => {
  it('formats +234 numbers', () => {
    expect(formatPhone('2348034567890')).toBe('+234 803 456 7890');
    expect(formatPhone('+2348034567890')).toBe('+234 803 456 7890');
  });

  it('formats 0 prefix numbers', () => {
    expect(formatPhone('08034567890')).toBe('0803 456 7890');
  });

  it('returns null for invalid numbers', () => {
    expect(formatPhone('123')).toBeNull();
    expect(formatPhone('abcdefghijk')).toBeNull();
    expect(formatPhone('0760 123 4567')).toBeNull();
  });
});

describe('normalizePhone', () => {
  it('normalizes to E.164 format', () => {
    expect(normalizePhone('08034567890')).toBe('+2348034567890');
    expect(normalizePhone('8034567890')).toBe('+2348034567890');
    expect(normalizePhone('2348034567890')).toBe('+2348034567890');
    expect(normalizePhone('+2348034567890')).toBe('+2348034567890');
  });

  it('handles formatted input', () => {
    expect(normalizePhone('0803 456 7890')).toBe('+2348034567890');
    expect(normalizePhone('+234 803 456 7890')).toBe('+2348034567890');
    expect(normalizePhone('+234 (0) 803-456-7890')).toBe('+2348034567890');
  });

  it('returns null for invalid numbers', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('080345678')).toBeNull();
    expect(normalizePhone('1234567890')).toBeNull();
    expect(normalizePhone('07601234567')).toBeNull();
    expect(normalizePhone('0803abc56789')).toBeNull();
  });
});

describe('isValidPhone', () => {
  it('validates Nigerian numbers', () => {
    expect(isValidPhone('08034567890')).toBe(true);
    expect(isValidPhone('2348034567890')).toBe(true);
    expect(isValidPhone('+2348034567890')).toBe(true);
    expect(isValidPhone('8034567890')).toBe(true);
    expect(isValidPhone('09123456789')).toBe(true);
  });

  it('rejects invalid numbers', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('12345678901234')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });
});
