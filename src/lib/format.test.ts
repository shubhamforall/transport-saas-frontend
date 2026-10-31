import { describe, expect, it } from 'vitest';
import { formatDate, formatPaise, initials } from './format';

describe('formatPaise', () => {
  it('formats integer paise as Indian rupees with lakh grouping', () => {
    expect(formatPaise(1_200_000)).toBe('₹12,000.00');
    expect(formatPaise(24_850_000)).toBe('₹2,48,500.00');
    expect(formatPaise(5)).toBe('₹0.05');
  });

  it('refuses non-integer money', () => {
    expect(() => formatPaise(10.5)).toThrow();
  });
});

describe('formatDate', () => {
  it('shows dates in India time', () => {
    // 20:00 UTC on 31 Oct is already 1 Nov in India.
    expect(formatDate('2026-10-31T20:00:00.000Z')).toBe('01 Nov 2026');
  });

  it('returns a dash for invalid input', () => {
    expect(formatDate('not a date')).toBe('—');
  });
});

describe('initials', () => {
  it('uses first and last name', () => {
    expect(initials('Ravi Sharma')).toBe('RS');
    expect(initials('  asha  ')).toBe('A');
    expect(initials('')).toBe('?');
  });
});
