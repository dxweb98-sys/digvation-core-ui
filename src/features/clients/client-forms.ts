import { read, type FieldSpec, type FieldValue, type FormValues } from '../../shared/forms/form-spec';
import type { Dto } from '../../shared/api/types';
import { uuidRef, type Brand, type Client, type ClientGroup, type Contact, type LegalEntity } from './clients-api';

const CODE_HINT = 'Huruf kapital, angka, dan garis bawah. Tidak bisa diubah setelah dibuat.';
const COLOR_RULE = (value: FieldValue) =>
  typeof value === 'string' && value.trim() && !/^#[0-9A-Fa-f]{6}$/.test(value.trim())
    ? 'Gunakan warna hex seperti #1A2B3C.'
    : undefined;
const URL_RULE = (value: FieldValue) =>
  typeof value === 'string' && value.trim() && !/^https?:\/\/\S+$/.test(value.trim())
    ? 'Gunakan alamat lengkap yang dimulai dengan https://.'
    : undefined;

const PROFILE_FIELDS: FieldSpec[] = [
  { name: 'display_name', label: 'Nama tampilan', required: true, maxLength: 150, half: true, placeholder: 'Nova' },
  { name: 'legal_name', label: 'Nama legal', maxLength: 200, half: true, placeholder: 'PT Nova Kreasi Indonesia' },
  { name: 'tax_identifier', label: 'NPWP', maxLength: 80, half: true },
  { name: 'email', label: 'Email organisasi', kind: 'email', maxLength: 254, half: true },
  { name: 'phone', label: 'Telepon organisasi', maxLength: 40, half: true },
  { name: 'website', label: 'Situs web', maxLength: 500, half: true, validate: URL_RULE },
  { name: 'country', label: 'Negara', maxLength: 80, half: true, placeholder: 'Indonesia' },
  { name: 'timezone', label: 'Zona waktu', half: true, placeholder: 'Asia/Jakarta' },
  { name: 'address', label: 'Alamat', kind: 'textarea', maxLength: 500 },
  { name: 'notes', label: 'Catatan', kind: 'textarea', maxLength: 1000 },
];

export const CLIENT_CREATE_FIELDS: FieldSpec[] = [
  {
    name: 'code',
    label: 'Code client',
    required: true,
    maxLength: 64,
    half: true,
    placeholder: 'NOVA',
    hint: `${CODE_HINT} The first brand gets the same code and name.`,
  },
  ...PROFILE_FIELDS,
  { name: 'primary_contact.name', label: 'Nama kontak utama', required: true, maxLength: 150, half: true },
  { name: 'primary_contact.position', label: 'Jabatan', maxLength: 100, half: true, placeholder: 'Owner' },
  { name: 'primary_contact.email', label: 'Email kontak', kind: 'email', maxLength: 254, half: true },
  { name: 'primary_contact.phone', label: 'Telepon kontak', maxLength: 40, half: true },
  {
    name: 'primary_contact.is_billing',
    label: 'Jadikan kontak penagihan juga',
    kind: 'toggle',
    hint: 'Invoice dikirim ke kontak penagihan. Kontak penagihan membutuhkan email.',
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
      is_pic: false,
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
  { name: 'name', label: 'Nama brand', required: true, maxLength: 150, half: true, placeholder: 'Nova Barber' },
  { name: 'website', label: 'Situs web', half: true, validate: URL_RULE },
  { name: 'description', label: 'Deskripsi', kind: 'textarea', maxLength: 500 },
  { name: 'logo_url', label: 'URL logo', validate: URL_RULE },
  { name: 'primary_color', label: 'Warna utama', half: true, placeholder: '#1A2B3C', validate: COLOR_RULE },
  { name: 'secondary_color', label: 'Warna sekunder', half: true, placeholder: '#FFFFFF', validate: COLOR_RULE },
];

export const BRAND_CREATE_FIELDS: FieldSpec[] = [
  { name: 'code', label: 'Code brand', required: true, maxLength: 64, half: true, placeholder: 'NOVA_BARBER', hint: CODE_HINT },
  ...BRAND_DETAIL_FIELDS,
];
export const BRAND_EDIT_FIELDS = BRAND_DETAIL_FIELDS;

/** Bill-to of this brand: its own legal entity, or the group default, or the client's name. */
export function brandLegalEntityField(legalEntities: readonly LegalEntity[]): FieldSpec {
  return {
    name: 'legal_entity_id',
    label: 'Legal entity brand ini',
    kind: 'select',
    half: true,
    options: [
      { value: NO_LEGAL_ENTITY, label: 'Mengikuti group atau nama client' },
      ...legalEntities.map((entity) => ({ value: entity.id, label: entity.name })),
    ],
    hint: 'Nama ini yang dicetak sebagai pihak penagihan invoice brand. Saat kosong, brand mengikuti default group-nya lalu nama client.',
  };
}

export function brandCreateFields(legalEntities: readonly LegalEntity[]): FieldSpec[] {
  return [...BRAND_CREATE_FIELDS, brandLegalEntityField(legalEntities)];
}

export function brandEditFields(legalEntities: readonly LegalEntity[]): FieldSpec[] {
  return [...BRAND_EDIT_FIELDS, brandLegalEntityField(legalEntities)];
}

export function brandBody(values: FormValues) {
  return {
    name: read.text(values, 'name'),
    website: read.optional(values, 'website'),
    description: read.optional(values, 'description'),
    logo_url: read.optional(values, 'logo_url'),
    primary_color: read.optional(values, 'primary_color')?.toUpperCase() ?? null,
    secondary_color: read.optional(values, 'secondary_color')?.toUpperCase() ?? null,
    legal_entity_id: legalEntityRef(values, 'legal_entity_id'),
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
    legal_entity_id: uuidRef(brand.legal_entity_id) ?? NO_LEGAL_ENTITY,
  };
}

const CLIENT_SCOPE = '__client__';
const GROUP_SCOPE = 'group:';
const BRAND_SCOPE = 'brand:';
/** The empty choice in a legal entity picker: bill to the client's own name. Exported so tests can name it. */
export const NO_LEGAL_ENTITY = '__none__';

/** A contact belongs to the whole client, one group, or one brand. */
export function contactFields(brands: readonly Brand[], groups: readonly ClientGroup[], editing?: Contact): FieldSpec[] {
  return [
    { name: 'name', label: 'Nama', required: true, maxLength: 150, half: true },
    { name: 'position', label: 'Jabatan', maxLength: 100, half: true },
    {
      name: 'email',
      label: 'Email',
      kind: 'email',
      maxLength: 254,
      half: true,
      validate: (value, values) =>
        values.is_billing === true && !(typeof value === 'string' && value.trim())
          ? 'Kontak penagihan membutuhkan email.'
          : undefined,
    },
    { name: 'phone', label: 'Telepon', maxLength: 40, half: true },
    {
      name: 'brand_id',
      label: 'Berlaku untuk',
      kind: 'select',
      required: true,
      options: [
        { value: CLIENT_SCOPE, label: 'Seluruh client' },
        ...groups.map((group) => ({ value: `${GROUP_SCOPE}${group.id}`, label: `Group: ${group.name}` })),
        ...brands.map((brand) => ({ value: `${BRAND_SCOPE}${brand.id}`, label: `Brand: ${brand.name}` })),
      ],
      hint: 'Kontak group dipakai oleh semua brand di group itu; kontak brand hanya oleh brand tersebut. Service yang tidak punya PIC sendiri memakai kontak ini.',
    },
    { name: 'is_billing', label: 'Kontak penagihan', kind: 'toggle', half: true },
    { name: 'is_technical', label: 'Kontak teknis', kind: 'toggle', half: true },
    {
      name: 'is_pic',
      label: 'Penanggung jawab (PIC)',
      kind: 'toggle',
      half: true,
      hint: 'Service tanpa PIC sendiri memakai PIC brand, lalu PIC group, lalu PIC client.',
    },
    {
      name: 'is_primary',
      label: 'Kontak utama',
      kind: 'toggle',
      disabled: editing?.is_primary,
      hint: editing?.is_primary
        ? 'Untuk mengganti kontak utama, jadikan kontak lain sebagai utama.'
        : 'Kontak utama yang sekarang akan melepas flag-nya.',
    },
  ];
}

export function contactBody(values: FormValues) {
  const scope = read.text(values, 'brand_id');
  const groupId = scope.startsWith(GROUP_SCOPE) ? scope.slice(GROUP_SCOPE.length) : null;
  const brandId = scope.startsWith(BRAND_SCOPE) ? scope.slice(BRAND_SCOPE.length) : null;
  return {
    name: read.text(values, 'name'),
    position: read.optional(values, 'position'),
    email: read.optional(values, 'email'),
    phone: read.optional(values, 'phone'),
    brand_id: brandId,
    group_id: groupId,
    is_billing: read.bool(values, 'is_billing'),
    is_technical: read.bool(values, 'is_technical'),
    is_pic: read.bool(values, 'is_pic'),
    is_primary: read.bool(values, 'is_primary'),
  };
}

/**
 * A legal entity is the party an invoice is billed to: the client's own name,
 * or another entity a brand or a group points at.
 */
const LEGAL_ENTITY_DETAIL_FIELDS: FieldSpec[] = [
  { name: 'legal_name', label: 'Nama legal', maxLength: 200, half: true, placeholder: 'PT Nova Kreasi Indonesia' },
  { name: 'tax_identifier', label: 'NPWP', maxLength: 80, half: true, placeholder: '01.234.567.8-901.000' },
  { name: 'email', label: 'Email', kind: 'email', maxLength: 254, half: true },
  { name: 'phone', label: 'Telepon', maxLength: 40, half: true },
  { name: 'country', label: 'Negara', maxLength: 80, half: true, placeholder: 'Indonesia' },
  { name: 'timezone', label: 'Zona waktu', half: true, placeholder: 'Asia/Jakarta' },
  { name: 'address', label: 'Alamat', kind: 'textarea', maxLength: 500 },
  { name: 'notes', label: 'Catatan', kind: 'textarea', maxLength: 1000 },
];

export const LEGAL_ENTITY_CREATE_FIELDS: FieldSpec[] = [
  {
    name: 'name',
    label: 'Nama',
    required: true,
    maxLength: 150,
    half: true,
    placeholder: 'Nova Kreasi Indonesia',
    hint: 'Nama ini yang dipilih brand dan group sebagai pihak penagihan.',
  },
  ...LEGAL_ENTITY_DETAIL_FIELDS,
];

export const LEGAL_ENTITY_EDIT_FIELDS = LEGAL_ENTITY_CREATE_FIELDS;

function legalEntityBody(values: FormValues) {
  return {
    name: read.text(values, 'name'),
    legal_name: read.optional(values, 'legal_name'),
    tax_identifier: read.optional(values, 'tax_identifier'),
    email: read.optional(values, 'email'),
    phone: read.optional(values, 'phone'),
    country: read.optional(values, 'country'),
    timezone: read.optional(values, 'timezone'),
    address: read.optional(values, 'address'),
    notes: read.optional(values, 'notes'),
  };
}

export const createLegalEntityBody = (values: FormValues): Dto<'CreateLegalEntityDto'> => legalEntityBody(values);

export const updateLegalEntityBody = (values: FormValues): Dto<'UpdateLegalEntityDto'> => legalEntityBody(values);

export function legalEntityFormValues(entity?: LegalEntity): FormValues {
  return {
    name: entity?.name ?? '',
    legal_name: entity?.legal_name ?? '',
    tax_identifier: entity?.tax_identifier ?? '',
    email: entity?.email ?? '',
    phone: entity?.phone ?? '',
    country: entity?.country ?? '',
    timezone: entity?.timezone ?? '',
    address: entity?.address ?? '',
    notes: entity?.notes ?? '',
  };
}

/** A group names its brands' default legal entity; an empty choice means none. */
export function groupFields(legalEntities: readonly LegalEntity[]): FieldSpec[] {
  return [
    { name: 'name', label: 'Nama group', required: true, maxLength: 150, half: true, placeholder: 'Barbershops' },
    {
      name: 'default_legal_entity_id',
      label: 'Legal entity default',
      kind: 'select',
      half: true,
      options: [
        { value: NO_LEGAL_ENTITY, label: 'Tanpa default' },
        ...legalEntities.map((entity) => ({ value: entity.id, label: entity.name })),
      ],
      hint: 'Dipakai brand di group ini selama brand tidak menunjuk legal entity sendiri.',
    },
    { name: 'notes', label: 'Catatan', kind: 'textarea', maxLength: 1000 },
  ];
}

/** Starting a group from a brand may leave the name out; CORE then uses the brand's name. */
export function startGroupFields(brandName: string, legalEntities: readonly LegalEntity[]): FieldSpec[] {
  return groupFields(legalEntities).map((field) =>
    field.name === 'name'
      ? { ...field, required: false, placeholder: brandName, hint: 'Kosong berarti group memakai nama brand ini.' }
      : field,
  );
}

/** A picker's empty choice is the sentinel, not a value CORE may store. */
function legalEntityRef(values: FormValues, name: string): string | null {
  const value = read.optional(values, name);
  return !value || value === NO_LEGAL_ENTITY ? null : value;
}

export function groupBody(values: FormValues) {
  return {
    name: read.text(values, 'name'),
    notes: read.optional(values, 'notes'),
    default_legal_entity_id: legalEntityRef(values, 'default_legal_entity_id'),
  };
}

/** The name is only sent when the operator typed one. */
export function startGroupBody(values: FormValues) {
  const name = read.text(values, 'name');
  return {
    ...(name ? { name } : {}),
    notes: read.optional(values, 'notes'),
    default_legal_entity_id: legalEntityRef(values, 'default_legal_entity_id'),
  };
}

/** The picker starts on "no default", so the sentinel is named here once. */
export function startGroupFormValues(brand: Brand): FormValues {
  return {
    name: '',
    notes: '',
    default_legal_entity_id: uuidRef(brand.legal_entity_id) ?? NO_LEGAL_ENTITY,
  };
}

export function groupFormValues(group?: ClientGroup): FormValues {
  return {
    name: group?.name ?? '',
    notes: group?.notes ?? '',
    default_legal_entity_id: group?.default_legal_entity_id ?? NO_LEGAL_ENTITY,
  };
}

export function contactFormValues(contact?: Contact): FormValues {
  const scope = contact?.group_id
    ? `${GROUP_SCOPE}${contact.group_id}`
    : contact?.brand_id
      ? `${BRAND_SCOPE}${contact.brand_id}`
      : CLIENT_SCOPE;
  return {
    name: contact?.name ?? '',
    position: contact?.position ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    brand_id: scope,
    is_billing: contact?.is_billing ?? false,
    is_technical: contact?.is_technical ?? false,
    is_pic: contact?.is_pic ?? false,
    is_primary: contact?.is_primary ?? false,
  };
}
