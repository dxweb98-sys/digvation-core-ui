/**
 * CORE stores money as minor units in a string of digits (BigInt), using the
 * ISO 4217 exponent: IDR has two, so Rp350.000 is "35000000". Operators see
 * and type IDR as whole rupiah only.
 */
const ZERO_DECIMALS = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);
const THREE_DECIMALS = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

export function currencyExponent(currency: string) {
  if (ZERO_DECIMALS.has(currency)) return 0;
  if (THREE_DECIMALS.has(currency)) return 3;
  return 2;
}

function toBigInt(minor: string | number | bigint): bigint {
  if (typeof minor === 'bigint') return minor;
  if (typeof minor === 'number') return BigInt(Math.trunc(minor));
  const text = minor.trim();
  if (!/^-?\d+$/.test(text)) throw new Error(`Not a minor-unit amount: ${minor}`);
  return BigInt(text);
}

/** "35000000" IDR -> 350000 (whole rupiah; sen are dropped toward zero). */
export function minorToRupiah(minor: string | number | bigint): number {
  return Number(toBigInt(minor) / 100n);
}

/** 350000 -> "35000000". Refuses anything that is not a whole number of rupiah. */
export function rupiahToMinor(rupiah: number): string {
  if (!Number.isSafeInteger(rupiah)) throw new Error('Rupiah amounts must be whole numbers.');
  return (BigInt(rupiah) * 100n).toString();
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

const RUPIAH = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** Display of a CORE amount: "Rp 350.000" for IDR, ISO code and decimals otherwise. */
export function formatMoney(minor: string | number | bigint | null | undefined, currency = 'IDR') {
  if (minor === null || minor === undefined || minor === '') return '—';
  const value = toBigInt(minor);
  if (currency === 'IDR') {
    const sign = value < 0n ? '-' : '';
    const abs = value < 0n ? -value : value;
    return `${sign}Rp ${RUPIAH.format(Number(abs / 100n))}`;
  }
  const exponent = currencyExponent(currency);
  const divisor = 10 ** exponent;
  return `${currency} ${new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(Number(value) / divisor)}`;
}

export function sumMinor(values: readonly (string | null | undefined)[]): string {
  return values.reduce<bigint>((total, value) => total + (value ? toBigInt(value) : 0n), 0n).toString();
}
