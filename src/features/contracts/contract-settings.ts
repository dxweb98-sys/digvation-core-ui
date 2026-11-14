import type { Dto } from '../../shared/api/types';
import { read, type FieldSpec, type FormValues } from '../../shared/forms/form-spec';
import type { Contract } from './contracts-api';

export const CONTRACT_SETTINGS_FIELDS: FieldSpec[] = [
  { name: 'contract_reference', label: 'Contract reference', maxLength: 100, placeholder: 'SPK/2026/014' },
  {
    name: 'renewal_notice_days',
    label: 'Renewal notice (days)',
    kind: 'integer',
    required: true,
    half: true,
    min: 0,
    max: 365,
    hint: 'CORE drafts the renewal this many days before a term ends.',
  },
  {
    name: 'grace_period_days',
    label: 'Grace period (days)',
    kind: 'integer',
    required: true,
    half: true,
    min: 0,
    max: 365,
    hint: 'Days after a term ends without renewal before the contract expires.',
  },
  {
    name: 'auto_renew',
    label: 'Renew automatically',
    kind: 'toggle',
    hint: 'An untouched renewal draft is confirmed with its prefilled price when the term ends.',
  },
  { name: 'billable', label: 'Billable', kind: 'toggle', hint: 'Off for a complimentary arrangement: no invoices.' },
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
