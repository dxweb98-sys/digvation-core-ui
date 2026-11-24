import { TZDate } from '@date-fns/tz';
import { format, isValid, parse, type Locale } from 'date-fns';
import { enUS, id } from 'date-fns/locale';
import { getDisplayLocale, type DisplayLocale } from './locale';

/**
 * Dates (spec D30):
 * - an instant is ISO 8601 UTC and is shown in the time zone the browser
 *   reports, never a fixed one;
 * - a business date is a calendar date (`YYYY-MM-DD`) and is shown as it is,
 *   never shifted by a time zone;
 * - the business "today" is CORE's BUSINESS_TIMEZONE, so it is computed in
 *   Asia/Jakarta, whatever zone the operator is in.
 */
export const BUSINESS_TIME_ZONE = 'Asia/Jakarta';

export type DateStyle = 'long' | 'medium' | 'short';

const DATE_PATTERNS: Record<DisplayLocale, Record<DateStyle, string>> = {
  // "24 November 2026", "24 Nov 2026", "24-11-2026"
  'id-ID': { long: 'd MMMM yyyy', medium: 'd MMM yyyy', short: 'dd-MM-yyyy' },
  // "November 24, 2026", "Nov 24, 2026", "11/24/2026"
  'en-US': { long: 'MMMM d, yyyy', medium: 'MMM d, yyyy', short: 'MM/dd/yyyy' },
};

const TIME_PATTERNS: Record<DisplayLocale, string> = { 'id-ID': 'HH.mm', 'en-US': 'h:mm a' };

const DATE_FNS_LOCALES: Record<DisplayLocale, Locale> = { 'id-ID': id, 'en-US': enUS };

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDate(value: string | null | undefined): value is string {
  const match = value ? CALENDAR_DATE.exec(value) : null;
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** The time zone the browser reports; UTC if it reports none. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The business (Asia/Jakarta) calendar date of an instant. */
export function calendarDateOf(instant: Date | string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  return format(new TZDate(date.getTime(), BUSINESS_TIME_ZONE), 'yyyy-MM-dd');
}

/** Today's business date. */
export function todayBusinessDate(now: Date = new Date()) {
  return calendarDateOf(now);
}

/**
 * "2026-11-24" -> "24 Nov 2026" (id-ID) or "Nov 24, 2026" (en-US). The
 * calendar fields are formatted as they are: no time zone takes part.
 */
export function formatBusinessDate(
  value: string | null | undefined,
  style: DateStyle = 'medium',
  locale: DisplayLocale = getDisplayLocale(),
) {
  if (!value) return '—';
  const day = value.slice(0, 10);
  if (!isCalendarDate(day)) return value;
  const [year, month, date] = day.split('-').map(Number);
  return format(new Date(year, month - 1, date), DATE_PATTERNS[locale][style], {
    locale: DATE_FNS_LOCALES[locale],
  });
}

/** An instant in the browser's time zone with its time: "24 Nov 2026 10.05" or "Nov 24, 2026 10:05 AM". */
export function formatInstant(
  value: string | null | undefined,
  options: { style?: DateStyle; locale?: DisplayLocale; timeZone?: string } = {},
) {
  if (!value) return '—';
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return value;
  const locale = options.locale ?? getDisplayLocale();
  const zoned = new TZDate(instant.getTime(), options.timeZone ?? browserTimeZone());
  const pattern = `${DATE_PATTERNS[locale][options.style ?? 'medium']} ${TIME_PATTERNS[locale]}`;
  return format(zoned, pattern, { locale: DATE_FNS_LOCALES[locale] });
}

/**
 * A typed business date in the language's short form ("24-11-2026" for
 * id-ID, "11/24/2026" for en-US), or an ISO one, to `YYYY-MM-DD`; undefined
 * when it is not a real date.
 */
export function parseBusinessDateInput(text: string, locale: DisplayLocale = getDisplayLocale()): string | undefined {
  const trimmed = text.trim();
  if (CALENDAR_DATE.test(trimmed)) return isCalendarDate(trimmed) ? trimmed : undefined;
  const pattern = DATE_PATTERNS[locale].short;
  if (trimmed.length !== pattern.length) return undefined;
  const parsed = parse(trimmed, pattern, new Date(2000, 0, 1));
  if (!isValid(parsed)) return undefined;
  const iso = format(parsed, 'yyyy-MM-dd');
  return isCalendarDate(iso) ? iso : undefined;
}
