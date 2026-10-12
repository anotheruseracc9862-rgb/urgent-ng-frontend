import { describe, it, expect } from 'vitest';
import { formatMoney, parseMoneyToKobo, formatMoneyInput } from './money';

describe('formatMoney', () => {
  it('formats kobo to Naira with symbol', () => {
    expect(formatMoney(123456)).toBe('₦1,234.56');
    expect(formatMoney(100)).toBe('₦1.00');
    expect(formatMoney(0)).toBe('₦0.00');
  });

  it('handles large amounts', () => {
    expect(formatMoney(100000000)).toBe('₦1,000,000.00');
  });
});

describe('parseMoneyToKobo', () => {
  it('parses valid money strings', () => {
    expect(parseMoneyToKobo('1234.56')).toBe(123456);
    expect(parseMoneyToKobo('1,234.56')).toBe(123456);
    expect(parseMoneyToKobo('₦1,234.56')).toBe(123456);
    expect(parseMoneyToKobo('1234')).toBe(123400);
  });

  it('handles decimal precision', () => {
    expect(parseMoneyToKobo('10.5')).toBe(1050);
    expect(parseMoneyToKobo('10.50')).toBe(1050);
  });

  it('returns null for invalid input', () => {
    expect(parseMoneyToKobo('abc')).toBeNull();
    expect(parseMoneyToKobo('12.345')).toBeNull();
    expect(parseMoneyToKobo('-100')).toBeNull();
    expect(parseMoneyToKobo('')).toBeNull();
  });

  it('handles edge cases', () => {
    expect(parseMoneyToKobo('0')).toBe(0);
    expect(parseMoneyToKobo('0.00')).toBe(0);
    expect(parseMoneyToKobo('0.01')).toBe(1);
  });
});

describe('formatMoneyInput', () => {
  it('formats kobo for input field', () => {
    expect(formatMoneyInput(123456)).toBe('1,234.56');
    expect(formatMoneyInput(100)).toBe('1.00');
  });
});
