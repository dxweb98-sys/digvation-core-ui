import { isCalendarDate } from '../format/date';
import { parseRupiahInput } from '../format/money';

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

export type FieldKind =
  | 'text'
  | 'email'
  | 'password'
  | 'textarea'
  | 'integer'
  | 'select'
  | 'checklist'
  | 'date'
  | 'rupiah'
  | 'toggle'
  | 'file';

export type FieldValue = string | boolean | string[] | File | null;
export type FormValues = Record<string, FieldValue>;

export interface FieldSpec {
  /** The CORE request field, so server field errors land here. */
  name: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: readonly FieldOption[];
  maxLength?: number;
  min?: number;
  max?: number;
  /** Rupiah fields: whether a negative amount is allowed. */
  allowNegative?: boolean;
  disabled?: boolean;
  /** Shown only while this returns true. */
  visible?: (values: FormValues) => boolean;
  /** Extra rule; returns a message when the value is wrong. */
  validate?: (value: FieldValue, values: FormValues) => string | undefined;
  /** Half-width field in a two-column row. */
  half?: boolean;
  accept?: string;
}

export function isFieldVisible(field: FieldSpec, values: FormValues) {
  return field.visible ? field.visible(values) : true;
}

function isEmpty(value: FieldValue | undefined) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Messages per field for the visible fields that are wrong. */
export function validateForm(fields: readonly FieldSpec[], values: FormValues) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!isFieldVisible(field, values) || field.disabled) continue;
    const value = values[field.name];
    const kind = field.kind ?? 'text';
    if (field.required && kind !== 'toggle' && isEmpty(value)) {
      errors[field.name] = kind === 'select' || kind === 'checklist' ? 'Choose an option.' : 'This field is required.';
      continue;
    }
    if (!isEmpty(value) && typeof value === 'string') {
      const text = value.trim();
      if (field.maxLength && text.length > field.maxLength) {
        errors[field.name] = `Use at most ${field.maxLength} characters.`;
        continue;
      }
      if (kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        errors[field.name] = 'Enter a valid email address.';
        continue;
      }
      if (kind === 'date' && !isCalendarDate(text)) {
        errors[field.name] = 'Use a date in the format YYYY-MM-DD.';
        continue;
      }
      if (kind === 'integer') {
        const number = Number(text);
        if (!/^-?\d+$/.test(text) || !Number.isSafeInteger(number)) {
          errors[field.name] = 'Enter a whole number.';
          continue;
        }
        if (field.min !== undefined && number < field.min) {
          errors[field.name] = `Enter ${field.min} or more.`;
          continue;
        }
        if (field.max !== undefined && number > field.max) {
          errors[field.name] = `Enter ${field.max} or less.`;
          continue;
        }
      }
      if (kind === 'rupiah') {
        const rupiah = parseRupiahInput(text);
        if (rupiah === undefined) {
          errors[field.name] = 'Enter a whole rupiah amount.';
          continue;
        }
        if (rupiah < 0 && !field.allowNegative) {
          errors[field.name] = 'Enter an amount of 0 or more.';
          continue;
        }
        if (field.min !== undefined && rupiah < field.min) {
          errors[field.name] = `Enter at least Rp ${field.min.toLocaleString('id-ID')}.`;
          continue;
        }
      }
    }
    const custom = field.validate?.(value ?? null, values);
    if (custom) errors[field.name] = custom;
  }
  return errors;
}

export function initialFormValues(
  fields: readonly FieldSpec[],
  initial: Partial<FormValues> = {},
): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    const kind = field.kind ?? 'text';
    values[field.name] =
      initial[field.name] ??
      (kind === 'toggle' ? false : kind === 'checklist' ? [] : kind === 'file' ? null : '');
  }
  return { ...(initial as FormValues), ...values };
}

/** Reads typed values for a request body. */
export const read = {
  text(values: FormValues, name: string) {
    const value = values[name];
    return typeof value === 'string' ? value.trim() : '';
  },
  /** Trimmed text, or null when empty (clears an optional CORE field). */
  optional(values: FormValues, name: string) {
    return read.text(values, name) || null;
  },
  /** Trimmed text, or undefined when empty (leaves the field out). */
  omit(values: FormValues, name: string) {
    return read.text(values, name) || undefined;
  },
  integer(values: FormValues, name: string) {
    const text = read.text(values, name);
    return text ? Number(text) : undefined;
  },
  rupiah(values: FormValues, name: string) {
    return parseRupiahInput(read.text(values, name));
  },
  bool(values: FormValues, name: string) {
    return values[name] === true;
  },
  list(values: FormValues, name: string) {
    const value = values[name];
    return Array.isArray(value) ? value : [];
  },
  file(values: FormValues, name: string) {
    const value = values[name];
    return value instanceof File ? value : null;
  },
};
