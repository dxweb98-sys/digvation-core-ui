import { describe, expect, it } from 'vitest';
import { formatMoney, minorToRupiah, parseRupiahInput, rupiahToMinor } from './money';

describe('money', () => {
  it('converts between whole rupiah and CORE minor units (IDR has two decimals)', () => {
    expect(rupiahToMinor(350000)).toBe('35000000');
    expect(minorToRupiah('35000000')).toBe(350000);
    expect(minorToRupiah('35000099')).toBe(350000);
  });

  it('refuses fractional rupiah', () => {
    expect(() => rupiahToMinor(1.5)).toThrow();
  });

  it('formats IDR as whole rupiah in both languages', () => {
    expect(formatMoney({ amount: '35000000', currency: 'IDR' }, 'id-ID')).toBe('Rp 350.000');
    expect(formatMoney({ amount: '35000000', currency: 'IDR' }, 'en-US')).toBe('Rp 350,000');
    expect(formatMoney({ amount: '-150000', currency: 'IDR' }, 'id-ID')).toBe('-Rp 1.500');
    expect(formatMoney({ amount: '0', currency: 'IDR' }, 'id-ID')).toBe('Rp 0');
    expect(formatMoney(null)).toBe('—');
  });

  it('keeps amounts beyond Number precision exact', () => {
    expect(formatMoney({ amount: '900719925474099300', currency: 'IDR' }, 'id-ID')).toBe('Rp 9.007.199.254.740.993');
  });

  it('formats other currencies with their ISO decimals from Dinero currency data', () => {
    expect(formatMoney({ amount: '123456', currency: 'USD' }, 'en-US')).toBe('USD 1,234.56');
    expect(formatMoney({ amount: '123456', currency: 'USD' }, 'id-ID')).toBe('USD 1.234,56');
    expect(formatMoney({ amount: '1234', currency: 'JPY' }, 'en-US')).toBe('JPY 1,234');
    expect(formatMoney({ amount: '1234', currency: 'KWD' }, 'en-US')).toBe('KWD 1.234');
  });

  it('refuses an amount that is not minor units', () => {
    expect(() => formatMoney({ amount: '12.50', currency: 'IDR' })).toThrow();
  });

  it('parses typed rupiah and rejects sen', () => {
    expect(parseRupiahInput('Rp 1.500.000')).toBe(1500000);
    expect(parseRupiahInput('1500000')).toBe(1500000);
    expect(parseRupiahInput('-25.000')).toBe(-25000);
    expect(parseRupiahInput('1.500,50')).toBeUndefined();
    expect(parseRupiahInput('')).toBeUndefined();
  });
});
