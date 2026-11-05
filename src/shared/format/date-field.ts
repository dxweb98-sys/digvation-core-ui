/**
 * Date inputs that are sent to CORE. The field holds a YYYY-MM-DD calendar date
 * in the browser time zone; CORE only ever receives a full ISO instant.
 */
const DATE_INPUT = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, length = 2) {
  return String(value).padStart(length, '0');
}

/** The local calendar date of an instant, as shown in a date field. */
export function instantToDateInput(instant: string | undefined) {
  if (!instant) return '';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The instant to send for a date field.
 *
 * A value still equal to the prefilled date returns the original instant
 * untouched. Any other value is the start of that day in the browser time zone.
 * Returns undefined when the field is empty or is not a real calendar date.
 */
export function dateInputToInstant(value: string | undefined, original?: string) {
  const text = value?.trim();
  if (!text) return undefined;
  if (original && text === instantToDateInput(original)) return original;
  const match = DATE_INPUT.exec(text);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDate ? date.toISOString() : undefined;
}
