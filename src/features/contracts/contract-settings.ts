import type { Dto } from '../../shared/api/types';
import { read, type FieldSpec, type FormValues } from '../../shared/forms/form-spec';
import type { Contract } from './contracts-api';

export const CONTRACT_SETTINGS_FIELDS: FieldSpec[] = [
  { name: 'contract_reference', label: 'Referensi contract', maxLength: 100, placeholder: 'SPK/2026/014' },
  {
    name: 'renewal_notice_days',
    label: 'Pemberitahuan perpanjangan (hari)',
    kind: 'integer',
    required: true,
    half: true,
    min: 0,
    max: 365,
    hint: 'CORE membuat draf perpanjangan sejumlah hari ini sebelum term berakhir.',
  },
  {
    name: 'grace_period_days',
    label: 'Masa tenggang (hari)',
    kind: 'integer',
    required: true,
    half: true,
    min: 0,
    max: 365,
    hint: 'Batas hari setelah term berakhir tanpa perpanjangan sampai contract kedaluwarsa.',
  },
  {
    name: 'auto_renew',
    label: 'Perpanjang otomatis',
    kind: 'toggle',
    hint: 'Draf perpanjangan yang tidak diubah dikonfirmasi dengan harga isian otomatisnya saat term berakhir.',
  },
  { name: 'billable', label: 'Ditagih', kind: 'toggle', hint: 'Nonaktifkan untuk kesepakatan gratis: tidak ada invoice.' },
];

export function contractSettingsValues(contract?: Contract): FormValues {
  return {
    contract_reference: contract?.contract_reference ?? '',
    renewal_notice_days: String(contract?.renewal_notice_days ?? 30),
    grace_period_days: String(contract?.grace_period_days ?? 0),
    auto_renew: contract?.auto_renew ?? false,
    billable: contract?.billable ?? true,
  };
}

export function contractSettingsBody(values: FormValues): Dto<'UpdateContractDto'> {
  return {
    contract_reference: read.optional(values, 'contract_reference'),
    renewal_notice_days: read.integer(values, 'renewal_notice_days') ?? 30,
    grace_period_days: read.integer(values, 'grace_period_days') ?? 0,
    auto_renew: read.bool(values, 'auto_renew'),
    billable: read.bool(values, 'billable'),
  };
}
