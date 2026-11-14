import type { FieldSpec } from '../../shared/forms/form-spec';

export const PRODUCT_KINDS = [
  { value: 'RUNTIME_PRODUCT', label: 'Runtime product' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'CUSTOM_SYSTEM', label: 'Custom system' },
  { value: 'OTHER', label: 'Other' },
];

/** Manifest format is part of installation work and is not edited here. */
export const PRODUCT_FIELDS: FieldSpec[] = [
  { name: 'kind', label: 'Kind', kind: 'select', required: true, half: true, options: PRODUCT_KINDS },
  { name: 'name', label: 'Name', required: true, maxLength: 150, placeholder: 'Business Suite' },
  { name: 'description', label: 'Description', kind: 'textarea', maxLength: 500 },
];
