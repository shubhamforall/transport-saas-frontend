import { describe, expect, it } from 'vitest';
import { milliToInput, paiseToInput, parseMilli, parseRupees } from './money';
import { previewTotals } from './invoice-calc';

describe('rupee parsing (no floating point)', () => {
  it('parses rupees to integer paise', () => {
    expect(parseRupees('12,000.50')).toBe(1_200_050);
    expect(parseRupees('₹ 0.1')).toBe(10);
    expect(parseRupees('7')).toBe(700);
    // 0.1 + 0.2 style float errors cannot happen
    expect(parseRupees('0.29')).toBe(29);
  });

  it('rejects bad input', () => {
    expect(parseRupees('')).toBeNull();
    expect(parseRupees('12.345')).toBeNull();
    expect(parseRupees('-5')).toBeNull();
    expect(parseRupees('abc')).toBeNull();
  });

  it('round-trips for inputs', () => {
    expect(paiseToInput(1_200_050)).toBe('12000.50');
    expect(paiseToInput(700)).toBe('7');
    expect(parseMilli('2.5')).toBe(2500);
    expect(milliToInput(2500)).toBe('2.5');
    expect(parseMilli('1.2345')).toBeNull();
  });
});

describe('invoice preview matches the server maths', () => {
  const lines = [
    { quantityMilli: 1000, unitPriceMinor: 1_200_000, discountMinor: 50_000, taxRateBps: 1800 },
    { quantityMilli: 1000, unitPriceMinor: 100_000, discountMinor: 0, taxRateBps: 1800 },
  ];

  it('CGST + SGST (same numbers as the backend invoice test)', () => {
    expect(previewTotals(lines, 'INTRA_STATE')).toMatchObject({
      subtotalMinor: 1_300_000,
      discountMinor: 50_000,
      taxableMinor: 1_250_000,
      cgstMinor: 112_500,
      sgstMinor: 112_500,
      grandTotalMinor: 1_475_000,
    });
  });

  it('IGST and no-tax', () => {
    expect(previewTotals(lines, 'INTER_STATE')).toMatchObject({
      igstMinor: 225_000,
      grandTotalMinor: 1_475_000,
    });
    expect(previewTotals(lines, 'NONE')).toMatchObject({
      taxTotalMinor: 0,
      grandTotalMinor: 1_250_000,
    });
  });

  it('rounds half-up per paisa', () => {
    expect(
      previewTotals(
        [{ quantityMilli: 2500, unitPriceMinor: 3333, discountMinor: 0, taxRateBps: 0 }],
        'NONE',
      ).grandTotalMinor,
    ).toBe(8333);
  });
});
