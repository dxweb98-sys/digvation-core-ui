/**
 * Business dates are calendar dates (`YYYY-MM-DD`) in Asia/Jakarta, CORE's
 * business time zone. Instants (`created_at`, `issued_at`) are shown in the
 * same zone whatever the browser's own zone is.
 */
export const BUSINESS_TIME_ZONE = 'Asia/Jakarta';

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDate(value: string | null | undefined): value is string {
  const match = value ? CALENDAR_DATE.exec(value) : null;
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** The Jakarta calendar date of an instant. */
export function calendarDateOf(instant: Date | string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Today's business date. */
export function todayBusinessDate(now: Date = new Date()) {
  return calendarDateOf(now);
}

const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-12-31" -> "31 Des 2026". The date is shown as is, never shifted by a zone. */
export function formatBusinessDate(value: string | null | undefined) {
  if (!value) return '—';
  const day = value.slice(0, 10);
  if (!isCalendarDate(day)) return value;
  return DATE_FORMAT.format(new Date(`${day}T00:00:00Z`));
}

const INSTANT_FORMAT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
});

/** An instant in Jakarta time: "31 Des 2026, 14.05". */
export function formatInstant(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : INSTANT_FORMAT.format(date);
}
