import { read, type FieldSpec, type FieldValue, type FormValues } from '../../shared/forms/form-spec';
import type { Dto } from '../../shared/api/types';
import type { Brand, Client, Contact } from './clients-api';

const CODE_HINT = 'Uppercase letters, digits and underscores. It cannot be changed later.';
const COLOR_RULE = (value: FieldValue) =>
  typeof value === 'string' && value.trim() && !/^#[0-9A-Fa-f]{6}$/.test(value.trim())
    ? 'Use a hex color such as #1A2B3C.'
    : undefined;
const URL_RULE = (value: FieldValue) =>
  typeof value === 'string' && value.trim() && !/^https?:\/\/\S+$/.test(value.trim())
    ? 'Use a full address starting with https://.'
    : undefined;

const PROFILE_FIELDS: FieldSpec[] = [
  { name: 'display_name', label: 'Display name', required: true, maxLength: 150, half: true, placeholder: 'Nova' },
  { name: 'legal_name', label: 'Legal name', maxLength: 200, half: true, placeholder: 'PT Nova Kreasi Indonesia' },
  { name: 'tax_identifier', label: 'Tax ID (NPWP)', maxLength: 80, half: true },
  { name: 'email', label: 'Organization email', kind: 'email', maxLength: 254, half: true },
  { name: 'phone', label: 'Organization phone', maxLength: 40, half: true },
  { name: 'website', label: 'Website', maxLength: 500, half: true, validate: URL_RULE },
  { name: 'country', label: 'Country', maxLength: 80, half: true, placeholder: 'Indonesia' },
  { name: 'timezone', label: 'Time zone', half: true, placeholder: 'Asia/Jakarta' },
  { name: 'address', label: 'Address', kind: 'textarea', maxLength: 500 },
  { name: 'notes', label: 'Notes', kind: 'textarea', maxLength: 1000 },
];

export const CLIENT_CREATE_FIELDS: FieldSpec[] = [
  {
    name: 'code',
    label: 'Client code',
    required: true,
    maxLength: 64,
    half: true,
    placeholder: 'NOVA',
    hint: `${CODE_HINT} The first brand gets the same code and name.`,
  },
  ...PROFILE_FIELDS,
  { name: 'primary_contact.name', label: 'Primary contact name', required: true, maxLength: 150, half: true },
  { name: 'primary_contact.position', label: 'Position', maxLength: 100, half: true, placeholder: 'Owner' },
  { name: 'primary_contact.email', label: 'Contact email', kind: 'email', maxLength: 254, half: true },
  { name: 'primary_contact.phone', label: 'Contact phone', maxLength: 40, half: true },
  {
    name: 'primary_contact.is_billing',
    label: 'Also the billing contact',
    kind: 'toggle',
    hint: 'Invoices are sent to billing contacts. A billing contact needs an email.',
  },
];

export const CLIENT_EDIT_FIELDS = PROFILE_FIELDS;

function profileBody(values: FormValues) {
  return {
    display_name: read.text(values, 'display_name'),
    legal_name: read.optional(values, 'legal_name'),
    tax_identifier: read.optional(values, 'tax_identifier'),
    email: read.optional(values, 'email'),
    phone: read.optional(values, 'phone'),
    website: read.optional(values, 'website'),
    country: read.optional(values, 'country'),
    timezone: read.optional(values, 'timezone'),
    address: read.optional(values, 'address'),
    notes: read.optional(values, 'notes'),
  };
}

export function createClientBody(values: FormValues): Dto<'CreateClientDto'> {
  return {
    ...profileBody(values),
    code: read.text(values, 'code').toUpperCase(),
    primary_contact: {
      name: read.text(values, 'primary_contact.name'),
      position: read.optional(values, 'primary_contact.position'),
      email: read.optional(values, 'primary_contact.email'),
      phone: read.optional(values, 'primary_contact.phone'),
      is_billing: read.bool(values, 'primary_contact.is_billing'),
      is_technical: false,
    },
  };
}

export const updateClientBody = (values: FormValues): Dto<'UpdateClientDto'> => profileBody(values);

export function clientFormValues(client: Client): FormValues {
  return {
    display_name: client.display_name,
    legal_name: client.legal_name ?? '',
    tax_identifier: client.tax_identifier ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    website: client.website ?? '',
    country: client.country ?? '',
    timezone: client.timezone ?? '',
    address: client.address ?? '',
    notes: client.notes ?? '',
  };
}

const BRAND_DETAIL_FIELDS: FieldSpec[] = [
  { name: 'name', label: 'Brand name', required: true, maxLength: 150, half: true, placeholder: 'Nova Barber' },
  { name: 'website', label: 'Website', half: true, validate: URL_RULE },
  { name: 'description', label: 'Description', kind: 'textarea', maxLength: 500 },
  { name: 'logo_url', label: 'Logo URL', validate: URL_RULE },
  { name: 'primary_color', label: 'Primary color', half: true, placeholder: '#1A2B3C', validate: COLOR_RULE },
  { name: 'secondary_color', label: 'Secondary color', half: true, placeholder: '#FFFFFF', validate: COLOR_RULE },
];

export const BRAND_CREATE_FIELDS: FieldSpec[] = [
  { name: 'code', label: 'Brand code', required: true, maxLength: 64, half: true, placeholder: 'NOVA_BARBER', hint: CODE_HINT },
  ...BRAND_DETAIL_FIELDS,
];
export const BRAND_EDIT_FIELDS = BRAND_DETAIL_FIELDS;

export function brandBody(values: FormValues) {
  return {
    name: read.text(values, 'name'),
    website: read.optional(values, 'website'),
    description: read.optional(values, 'description'),
    logo_url: read.optional(values, 'logo_url'),
    primary_color: read.optional(values, 'primary_color')?.toUpperCase() ?? null,
    secondary_color: read.optional(values, 'secondary_color')?.toUpperCase() ?? null,
  };
}

export function brandFormValues(brand: Brand): FormValues {
  return {
    name: brand.name,
    website: brand.website ?? '',
    description: brand.description ?? '',
    logo_url: brand.logo_url ?? '',
    primary_color: brand.primary_color ?? '',
    secondary_color: brand.secondary_color ?? '',
  };
}

const NO_BRAND = '__client__';

export function contactFields(brands: readonly Brand[], editing?: Contact): FieldSpec[] {
  return [
    { name: 'name', label: 'Name', required: true, maxLength: 150, half: true },
    { name: 'position', label: 'Position', maxLength: 100, half: true },
    {
      name: 'email',
      label: 'Email',
      kind: 'email',
      maxLength: 254,
      half: true,
      validate: (value, values) =>
        values.is_billing === true && !(typeof value === 'string' && value.trim())
          ? 'A billing contact needs an email.'
          : undefined,
    },
    { name: 'phone', label: 'Phone', maxLength: 40, half: true },
    {
      name: 'brand_id',
      label: 'Belongs to',
      kind: 'select',
      required: true,
      options: [
        { value: NO_BRAND, label: 'The whole client' },
        ...brands.map((brand) => ({ value: brand.id, label: `Brand: ${brand.name}` })),
      ],
      hint: 'A brand contact is used for that brand only, for example its billing contact.',
    },
    { name: 'is_billing', label: 'Billing contact', kind: 'toggle', half: true },
    { name: 'is_technical', label: 'Technical contact', kind: 'toggle', half: true },
    {
      name: 'is_primary',
      label: 'Primary contact',
      kind: 'toggle',
      disabled: editing?.is_primary,
      hint: editing?.is_primary
        ? 'To change the primary contact, make another contact primary.'
        : 'The current primary contact loses the flag.',
    },
  ];
}

export function contactBody(values: FormValues) {
  const brand = read.text(values, 'brand_id');
  return {
    name: read.text(values, 'name'),
    position: read.optional(values, 'position'),
    email: read.optional(values, 'email'),
    phone: read.optional(values, 'phone'),
    brand_id: brand && brand !== NO_BRAND ? brand : null,
    is_billing: read.bool(values, 'is_billing'),
    is_technical: read.bool(values, 'is_technical'),
    is_primary: read.bool(values, 'is_primary'),
  };
}

export function contactFormValues(contact?: Contact): FormValues {
  return {
    name: contact?.name ?? '',
    position: contact?.position ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    brand_id: contact?.brand_id ?? NO_BRAND,
    is_billing: contact?.is_billing ?? false,
    is_technical: contact?.is_technical ?? false,
    is_primary: contact?.is_primary ?? false,
  };
}
