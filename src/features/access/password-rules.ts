import type { FieldSpec, FieldValue, FormValues } from '../../shared/forms/form-spec';

/** CORE: 12 to 128 characters; the confirmation must match. */
export const PASSWORD_FIELDS: FieldSpec[] = [
  {
    name: 'new_password',
    label: 'Kata sandi baru',
    kind: 'password',
    required: true,
    maxLength: 128,
    hint: 'Minimal 12 karakter.',
    validate: (value) =>
      typeof value === 'string' && value.length > 0 && value.length < 12 ? 'Gunakan minimal 12 karakter.' : undefined,
  },
  {
    name: 'confirm_password',
    label: 'Konfirmasi kata sandi baru',
    kind: 'password',
    required: true,
    maxLength: 128,
    validate: (value: FieldValue, values: FormValues) =>
      value !== values.new_password ? 'Kata sandi tidak cocok.' : undefined,
  },
];

/** CORE lowercases usernames, then allows 3 to 50 letters, digits, ".", "_" or "-". */
export function USERNAME_RULE(value: FieldValue) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return /^[a-z0-9._-]{3,50}$/.test(value.trim().toLowerCase())
    ? undefined
    : 'Gunakan 3 sampai 50 huruf, angka, ".", "_" atau "-".';
}
