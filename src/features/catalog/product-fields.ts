import type { FieldSpec } from '../../shared/forms/form-spec';

export const PRODUCT_KINDS = [
  { value: 'RUNTIME_PRODUCT', label: 'Product runtime' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'CUSTOM_SYSTEM', label: 'Sistem kustom' },
  { value: 'OTHER', label: 'Lainnya' },
];

/** Manifest format is part of installation work and is not edited here. */
export const PRODUCT_FIELDS: FieldSpec[] = [
  { name: 'kind', label: 'Jenis', kind: 'select', required: true, half: true, options: PRODUCT_KINDS },
  { name: 'name', label: 'Nama', required: true, maxLength: 150, placeholder: 'Business Suite' },
  { name: 'description', label: 'Deskripsi', kind: 'textarea', maxLength: 500 },
];
