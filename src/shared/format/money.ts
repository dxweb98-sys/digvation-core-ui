import { dinero, toDecimal, type Dinero } from 'dinero.js/bigint';
import * as currencies from 'dinero.js/bigint/currencies';
import { getDisplayLocale, type DisplayLocale } from './locale';

/**
 * CORE money (spec D30): BigInt minor units in the ISO 4217 exponent of the
 * currency, sent as `{ amount: "<minor units>", currency }` and never
 * preformatted. Currency data and arithmetic come from Dinero.js, as in
 * core-v2. IDR is shown and typed as whole rupiah only (spec 3.6).
 */
export interface Money {
  amount: string;
  currency: string;
}

type Currency = (typeof currencies)[keyof typeof currencies];

function currencyOf(code: string): Currency {
  const known = (currencies as Record<string, Currency | undefined>)[code];
  if (known) return known;
  // A code Dinero does not know keeps two decimals, as in core-v2.
  return { code, base: 10n, exponent: 2n } as Currency;
}

function toBigInt(minor: string | bigint): bigint {
  if (typeof minor === 'bigint') return minor;
  const text = minor.trim();
  if (!/^-?\d+$/.test(text)) throw new Error(`Not a minor-unit amount: ${minor}`);
  return BigInt(text);
}

export function toDinero(money: Money): Dinero<bigint> {
  return dinero({ amount: toBigInt(money.amount), currency: currencyOf(money.currency) });
}

/** "35000000" IDR -> 350000 (whole rupiah; sen are dropped toward zero). */
export function minorToRupiah(minor: string | bigint): number {
  const exponent = currencyOf('IDR').exponent;
  return Number(toBigInt(minor) / 10n ** exponent);
}

/** 350000 -> "35000000". Refuses anything that is not a whole number of rupiah. */
export function rupiahToMinor(rupiah: number): string {
  if (!Number.isSafeInteger(rupiah)) throw new Error('Rupiah amounts must be whole numbers.');
  return (BigInt(rupiah) * 10n ** currencyOf('IDR').exponent).toString();
}

/** Parses typed rupiah ("Rp 1.500.000", "1500000") to a whole number, or undefined. */
export function parseRupiahInput(text: string): number | undefined {
  const trimmed = text.trim();
  const negative = trimmed.startsWith('-');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  if (/[,.]\d{1,2}$/.test(trimmed)) return undefined;
  const value = Number(digits);
  if (!Number.isSafeInteger(value)) return undefined;
  return negative ? -value : value;
}

/**
 * Display of a CORE amount in the active language: "Rp 350.000" (id-ID) or
 * "Rp 350,000" (en-US) for IDR, whole rupiah; other currencies show their ISO
 * code and their exponent's decimals.
 */
export function formatMoney(money: Money | null | undefined, locale: DisplayLocale = getDisplayLocale()) {
  if (!money || money.amount === '') return '—';
  const value = toDinero(money);
  if (money.currency === 'IDR') {
    // Whole rupiah: sen are dropped toward zero, never rounded up.
    const rupiah = toDecimal(value, ({ value: decimal }) => decimal.split('.')[0]);
    const negative = rupiah.startsWith('-');
    const digits = BigInt(negative ? rupiah.slice(1) : rupiah);
    const text = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(digits);
    return `${negative && digits !== 0n ? '-' : ''}Rp ${text}`;
  }
  const exponent = Number(currencyOf(money.currency).exponent);
  const decimal = toDecimal(value);
  const text = new Intl.NumberFormat(locale, {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(decimal as unknown as number);
  return `${money.currency} ${text}`;
}
