import type { Dto } from '../../shared/api/types';
import { read, type FieldSpec, type FormValues } from '../../shared/forms/form-spec';
import type { BillingSettings, TaxRate } from './billing-api';

const PATTERN_RULE = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const sequences = value.match(/\{SEQ:\d+\}/g) ?? [];
  if (sequences.length !== 1) return 'Gunakan tepat satu token {SEQ:n}.';
  const unknown = value.replace(/\{(YYYY|MM|BRAND|SEQ:\d+)\}/g, '').match(/\{[^}]*\}/);
  return unknown ? `Token ${unknown[0]} tidak dikenal. Gunakan {YYYY}, {MM}, {BRAND}, dan {SEQ:n}.` : undefined;
};

export const SETTINGS_FIELDS: FieldSpec[] = [
  { name: 'issuer_legal_name', label: 'Nama legal penerbit', required: true, placeholder: 'PT Digvation Teknologi Indonesia' },
  { name: 'issuer_tax_identifier', label: 'NPWP penerbit', half: true },
  { name: 'issuer_email', label: 'Email penerbit', kind: 'email', required: true, half: true },
  { name: 'issuer_phone', label: 'Telepon penerbit', required: true, half: true },
  { name: 'draft_lead_days', label: 'Batas awal draf (hari)', kind: 'integer', required: true, half: true, min: 0, max: 90, hint: 'Draf dibuat sekian hari sebelum periode billing dimulai.' },
  { name: 'issuer_address', label: 'Alamat penerbit', kind: 'textarea', required: true },
  { name: 'payment_instructions', label: 'Instruksi pembayaran', kind: 'textarea', required: true, hint: 'Tercetak di setiap PDF invoice.' },
  { name: 'invoice_number_pattern', label: 'Pola nomor invoice', required: true, half: true, validate: PATTERN_RULE },
  { name: 'credit_note_number_pattern', label: 'Pola nomor credit note', required: true, half: true, validate: PATTERN_RULE },
  { name: 'reason', label: 'Alasan perubahan', kind: 'textarea', required: true, maxLength: 500, hint: 'Disimpan bersama revisi.' },
];

export function settingsValues(settings: BillingSettings): FormValues {
  return {
    issuer_legal_name: settings.issuer_legal_name ?? '',
    issuer_tax_identifier: settings.issuer_tax_identifier ?? '',
    issuer_email: settings.issuer_email ?? '',
    issuer_phone: settings.issuer_phone ?? '',
    draft_lead_days: String(settings.draft_lead_days),
    issuer_address: settings.issuer_address ?? '',
    payment_instructions: settings.payment_instructions ?? '',
    invoice_number_pattern: settings.invoice_number_pattern,
    credit_note_number_pattern: settings.credit_note_number_pattern,
  };
}

export function taxRateInputs(rates: readonly TaxRate[]): Dto<'TaxRateInputDto'>[] {
  return rates.map((rate) => ({
    name: rate.name,
    rate_basis_points: rate.rate_basis_points,
    valid_from: rate.valid_from,
    valid_until: rate.valid_until,
  }));
}

/** PUT replaces everything: the scalar settings from the form, and the given tax rates. */
export function settingsBody(
  settings: BillingSettings,
  values: FormValues | null,
  taxRates: Dto<'TaxRateInputDto'>[],
  reason: string,
): Dto<'UpdateBillingSettingsDto'> {
  const source = values ?? settingsValues(settings);
  return {
    issuer_legal_name: read.text(source, 'issuer_legal_name'),
    issuer_tax_identifier: read.optional(source, 'issuer_tax_identifier'),
    issuer_email: read.text(source, 'issuer_email'),
    issuer_phone: read.text(source, 'issuer_phone'),
    issuer_address: read.text(source, 'issuer_address'),
    payment_instructions: read.text(source, 'payment_instructions'),
    default_currency: settings.default_currency || 'IDR',
    draft_lead_days: read.integer(source, 'draft_lead_days') ?? 7,
    invoice_number_pattern: read.text(source, 'invoice_number_pattern'),
    credit_note_number_pattern: read.text(source, 'credit_note_number_pattern'),
    tax_rates: taxRates,
    reason,
  };
}

/** "11" or "11,5" percent -> basis points; undefined when not a percentage. */
export function percentToBasisPoints(text: string) {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return undefined;
  const points = Math.round(Number(normalized) * 100);
  return points <= 10000 ? points : undefined;
}

export const formatPercent = (basisPoints: number) =>
  `${(basisPoints / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;

/** Validity periods must not overlap (CORE refuses them). */
export function overlappingRates(rates: readonly Dto<'TaxRateInputDto'>[]) {
  const sorted = [...rates].sort((a, b) => a.valid_from.localeCompare(b.valid_from));
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    if (!previous.valid_until || previous.valid_until >= sorted[index].valid_from) return true;
  }
  return false;
}
