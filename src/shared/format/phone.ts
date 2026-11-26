/**
 * Phones (core-v2 src/common/phone/phone.ts, spec 3.3, D24): CORE stores
 * E.164 digits without "+", an Indonesian number starting "62". The operator
 * types 08…, 62… or +62…, with spaces or dashes, and reads "0812 3456 7890".
 */

/** The digits CORE would store for an input, or undefined when CORE would refuse it (phone_format). */
export function normalizePhoneInput(value: string): string | undefined {
  const compact = value.replace(/[\s-]/g, '');
  const digits = compact.startsWith('+62')
    ? compact.slice(1)
    : compact.startsWith('08')
      ? `62${compact.slice(1)}`
      : compact;
  return /^628\d{7,12}$/.test(digits) || /^62[1-79]\d{6,11}$/.test(digits) ? digits : undefined;
}

/**
 * Stored "62…" digits as a local number: mobiles in groups of four
 * ("0812 3456 7890"), other numbers with the area code apart ("021 5550100").
 * Anything else is shown as stored.
 */
export function formatPhone(stored: string | null | undefined): string {
  if (!stored) return '';
  if (!/^62\d+$/.test(stored)) return stored;
  const local = `0${stored.slice(2)}`;
  if (local.startsWith('08')) return local.replace(/(\d{4})(?=\d)/g, '$1 ');
  const area = local.startsWith('021') || local.startsWith('022') || local.startsWith('024') || local.startsWith('031')
    ? 3
    : 4;
  return `${local.slice(0, area)} ${local.slice(area)}`;
}
