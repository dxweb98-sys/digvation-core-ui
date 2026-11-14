import { describe, expect, it } from 'vitest';
import { formatMoney, minorToRupiah, parseRupiahInput, rupiahToMinor, sumMinor } from './money';

describe('money', () => {
  it('converts between whole rupiah and CORE minor units (IDR has two decimals)', () => {
    expect(rupiahToMinor(350_000)).toBe('35000000');
    expect(minorToRupiah('35000000')).toBe(350_000);
    expect(minorToRupiah('-250000')).toBe(-2_500);
    expect(rupiahToMinor(0)).toBe('0');
  });

  it('refuses fractional rupiah', () => {
    expect(() => rupiahToMinor(1.5)).toThrow();
  });

  it('keeps amounts beyond Number precision exact', () => {
    expect(sumMinor(['9007199254740993', '7'])).toBe('9007199254741000');
  });

  it('formats IDR as whole rupiah with Indonesian grouping', () => {
    expect(formatMoney('35000000', 'IDR')).toBe('Rp 350.000');
    expect(formatMoney('-150000000', 'IDR')).toBe('-Rp 1.500.000');
    expect(formatMoney(null)).toBe('—');
  });

  it('formats other currencies with their ISO decimals', () => {
    expect(formatMoney('1501', 'USD')).toBe('USD 15,01');
    expect(formatMoney('1500', 'JPY')).toBe('JPY 1.500');
  });

  it('parses typed rupiah and rejects sen', () => {
    expect(parseRupiahInput('Rp 1.500.000')).toBe(1_500_000);
    expect(parseRupiahInput('2500000')).toBe(2_500_000);
    expect(parseRupiahInput('-5.000')).toBe(-5_000);
    expect(parseRupiahInput('1500,50')).toBeUndefined();
    expect(parseRupiahInput('')).toBeUndefined();
  });
});
