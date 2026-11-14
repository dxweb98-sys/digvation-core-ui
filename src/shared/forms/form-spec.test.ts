import { describe, expect, it } from 'vitest';
import { initialFormValues, read, validateForm, type FieldSpec } from './form-spec';

const fields: FieldSpec[] = [
  { name: 'code', label: 'Code', required: true, maxLength: 4 },
  { name: 'email', label: 'Email', kind: 'email' },
  { name: 'starts_on', label: 'Starts', kind: 'date', required: true },
  { name: 'amount', label: 'Amount', kind: 'rupiah', required: true },
  { name: 'days', label: 'Days', kind: 'integer', min: 0, max: 365 },
  { name: 'roles', label: 'Roles', kind: 'checklist', required: true },
  { name: 'reason', label: 'Reason', required: true, visible: (values) => values.adjust === true },
  { name: 'adjust', label: 'Adjust', kind: 'toggle' },
];

describe('form validation', () => {
  it('reports every required field that is empty, and skips hidden ones', () => {
    const errors = validateForm(fields, initialFormValues(fields));
    expect(Object.keys(errors).sort()).toEqual(['amount', 'code', 'roles', 'starts_on']);
    expect(errors.roles).toBe('Choose an option.');
  });

  it('checks a field that becomes visible', () => {
    const values = { ...initialFormValues(fields), adjust: true };
    expect(validateForm(fields, values).reason).toBe('This field is required.');
  });

  it('checks length, email, calendar dates, integers and whole rupiah', () => {
    const errors = validateForm(fields, {
      code: 'TOOLONG',
      email: 'not-an-email',
      starts_on: '2027-02-29',
      amount: '1.500,50',
      days: '400',
      roles: ['ADMIN'],
      adjust: false,
    });
    expect(errors).toEqual({
      code: 'Use at most 4 characters.',
      email: 'Enter a valid email address.',
      starts_on: 'Use a date in the format YYYY-MM-DD.',
      amount: 'Enter a whole rupiah amount.',
      days: 'Enter 365 or less.',
    });
  });

  it('refuses negative rupiah unless the field allows it', () => {
    const negative = { ...initialFormValues(fields), amount: '-5000' };
    expect(validateForm(fields, negative).amount).toBe('Enter an amount of 0 or more.');
    const credit: FieldSpec[] = [{ name: 'amount', label: 'Amount', kind: 'rupiah', allowNegative: true }];
    expect(validateForm(credit, { amount: '-5000' })).toEqual({});
  });

  it('runs a field’s own rule with the other values', () => {
    const confirm: FieldSpec[] = [
      { name: 'a', label: 'A' },
      { name: 'b', label: 'B', validate: (value, values) => (value !== values.a ? 'Must match.' : undefined) },
    ];
    expect(validateForm(confirm, { a: 'x', b: 'y' })).toEqual({ b: 'Must match.' });
  });

  it('reads typed values for a request', () => {
    const values = { name: '  Nova ', note: '  ', amount: 'Rp 1.500.000', days: '30', on: true, list: ['a'] };
    expect(read.text(values, 'name')).toBe('Nova');
    expect(read.optional(values, 'note')).toBeNull();
    expect(read.omit(values, 'note')).toBeUndefined();
    expect(read.rupiah(values, 'amount')).toBe(1_500_000);
    expect(read.integer(values, 'days')).toBe(30);
    expect(read.bool(values, 'on')).toBe(true);
    expect(read.list(values, 'list')).toEqual(['a']);
  });
});
