import type { Dto } from '../../shared/api/types';
import { formatMoney, minorToRupiah, rupiahToMinor } from '../../shared/format/money';
import { read, type FieldSpec, type FormValues } from '../../shared/forms/form-spec';
import { labelFor } from '../../shared/labels/labels';
import { BILLING_CYCLES, type Price } from '../catalog/catalog-api';
import type { Term } from './contracts-api';

const CYCLE_OPTIONS = BILLING_CYCLES.map((cycle) => ({ value: cycle, label: labelFor(cycle) }));
const ADJUSTMENTS = ['NONE', 'PROMOTIONAL', 'NEGOTIATED', 'GRANDFATHERED', 'COMPLIMENTARY'].map((value) => ({
  value,
  label: value === 'NONE' ? 'Tanpa penyesuaian (harga list)' : labelFor(value),
}));

/** The catalog list price for the chosen billing cycle, as CORE will snapshot it. */
export function listPriceFor(prices: readonly Price[], cycle: string) {
  return prices.find((price) => price.billing_cycle === cycle && price.currency === 'IDR');
}

/**
 * The term form. Starts on a date or at go-live; ends on a date or after a
 * duration. Amounts are whole rupiah.
 */
export function termFields(prices: readonly Price[], cycle: string, renewal?: Term): FieldSpec[] {
  const listPrice = listPriceFor(prices, cycle);
  return [
    {
      name: 'start_mode',
      label: 'Mulai',
      kind: 'select',
      required: true,
      half: true,
      options: [
        { value: 'DATE', label: 'Pada tanggal tertentu' },
        { value: 'GO_LIVE', label: 'Saat go-live installation production' },
      ],
    },
    { name: 'starts_on', label: 'Hari pertama', kind: 'date', required: true, half: true, visible: (values) => values.start_mode === 'DATE' },
    {
      name: 'end_mode',
      label: 'Berakhir',
      kind: 'select',
      required: true,
      half: true,
      options: [
        { value: 'DURATION', label: 'Setelah jangka waktu' },
        { value: 'DATE', label: 'Pada tanggal tertentu' },
      ],
      visible: (values) => values.start_mode === 'DATE',
    },
    {
      name: 'ends_on',
      label: 'Hari terakhir',
      kind: 'date',
      required: true,
      half: true,
      visible: (values) => values.start_mode === 'DATE' && values.end_mode === 'DATE',
      validate: (value, values) =>
        typeof value === 'string' && typeof values.starts_on === 'string' && value && values.starts_on && value < values.starts_on
          ? 'Hari terakhir tidak boleh sebelum hari pertama.'
          : undefined,
    },
    {
      name: 'duration_value',
      label: 'Jangka waktu',
      kind: 'integer',
      required: true,
      half: true,
      min: 1,
      max: 120,
      visible: (values) => values.start_mode === 'GO_LIVE' || values.end_mode === 'DURATION',
    },
    {
      name: 'duration_unit',
      label: 'Satuan',
      kind: 'select',
      required: true,
      half: true,
      options: [
        { value: 'MONTH', label: 'Bulan' },
        { value: 'DAY', label: 'Hari' },
      ],
      visible: (values) => values.start_mode === 'GO_LIVE' || values.end_mode === 'DURATION',
    },
    { name: 'billing_cycle', label: 'Siklus penagihan', kind: 'select', required: true, half: true, options: CYCLE_OPTIONS },
    {
      name: 'agreed_amount',
      label: cycle === 'PER_TERM' ? 'Harga disepakati untuk term (Rp)' : 'Harga disepakati per siklus (Rp)',
      kind: 'rupiah',
      required: true,
      half: true,
      hint: listPrice
        ? `Harga list: ${formatMoney(listPrice.amount, 'IDR')}.`
        : 'Tidak ada harga list untuk siklus ini; harga yang disepakati berlaku sendiri.',
    },
    { name: 'adjustment_type', label: 'Penyesuaian harga', kind: 'select', required: true, half: true, options: ADJUSTMENTS },
    {
      name: 'adjustment_reason',
      label: 'Alasan penyesuaian',
      kind: 'textarea',
      maxLength: 500,
      hint: renewal
        ? 'Wajib diisi jika harga berbeda dari harga list atau dari isian otomatis perpanjangan.'
        : 'Wajib diisi jika harga berbeda dari harga list, atau untuk penyesuaian apa pun.',
      validate: (value, values) => {
        const text = typeof value === 'string' ? value.trim() : '';
        if (text) return undefined;
        if (values.adjustment_type !== 'NONE') return 'Berikan alasan penyesuaian.';
        const amount = read.rupiah(values, 'agreed_amount');
        const list = listPriceFor(prices, String(values.billing_cycle));
        if (list && amount !== undefined && rupiahToMinor(amount) !== list.amount) {
          return 'Harga berbeda dari harga list; berikan alasan.';
        }
        return undefined;
      },
    },
    { name: 'trial_ends_on', label: 'Trial berakhir pada', kind: 'date', half: true, hint: 'Trial tidak ditagih.' },
    { name: 'payment_terms_days', label: 'Tempo pembayaran (hari)', kind: 'integer', required: true, half: true, min: 0, max: 365 },
    { name: 'planned_renewal_amount', label: 'Rencana harga perpanjangan (Rp)', kind: 'rupiah', half: true, hint: 'Perkiraan saja; dipakai untuk mengisi otomatis perpanjangan.' },
    { name: 'planned_renewal_cycle', label: 'Rencana siklus perpanjangan', kind: 'select', half: true, options: CYCLE_OPTIONS },
  ];
}

export function termFormValues(term?: Term): FormValues {
  if (!term) {
    return {
      start_mode: 'DATE',
      end_mode: 'DURATION',
      duration_value: '12',
      duration_unit: 'MONTH',
      billing_cycle: 'MONTHLY',
      adjustment_type: 'NONE',
      payment_terms_days: '14',
    };
  }
  const goLive = term.starts_at_go_live;
  return {
    start_mode: goLive ? 'GO_LIVE' : 'DATE',
    starts_on: term.starts_on ?? '',
    end_mode: goLive || !term.ends_on ? 'DURATION' : 'DATE',
    ends_on: term.ends_on ?? '',
    duration_value: String(term.duration_value ?? ''),
    duration_unit: term.duration_unit,
    billing_cycle: term.billing_cycle,
    agreed_amount: String(minorToRupiah(term.agreed_amount)),
    adjustment_type: term.adjustment_type,
    adjustment_reason: term.adjustment_reason ?? '',
    trial_ends_on: term.trial_ends_on ?? '',
    payment_terms_days: String(term.payment_terms_days),
    planned_renewal_amount: term.planned_renewal_amount ? String(minorToRupiah(term.planned_renewal_amount)) : '',
    planned_renewal_cycle: term.planned_renewal_cycle ?? '',
  };
}

const minorOrNull = (values: FormValues, name: string) => {
  const rupiah = read.rupiah(values, name);
  return rupiah === undefined ? null : rupiahToMinor(rupiah);
};

export function termBody(values: FormValues): Dto<'CreateTermDto'> {
  const goLive = values.start_mode === 'GO_LIVE';
  const byDuration = goLive || values.end_mode === 'DURATION';
  return {
    starts_at_go_live: goLive,
    starts_on: goLive ? null : read.text(values, 'starts_on'),
    ends_on: byDuration ? null : read.text(values, 'ends_on'),
    duration_value: byDuration ? (read.integer(values, 'duration_value') ?? null) : null,
    duration_unit: byDuration ? (read.text(values, 'duration_unit') as 'MONTH' | 'DAY') : null,
    billing_cycle: read.text(values, 'billing_cycle') as Term['billing_cycle'],
    currency: 'IDR',
    agreed_amount: rupiahToMinor(read.rupiah(values, 'agreed_amount') ?? 0),
    adjustment_type: read.text(values, 'adjustment_type') as Term['adjustment_type'],
    adjustment_reason: read.optional(values, 'adjustment_reason'),
    trial_ends_on: read.optional(values, 'trial_ends_on'),
    payment_terms_days: read.integer(values, 'payment_terms_days') ?? 14,
    planned_renewal_amount: minorOrNull(values, 'planned_renewal_amount'),
    planned_renewal_cycle: (read.optional(values, 'planned_renewal_cycle') as Term['billing_cycle'] | null) ?? null,
  };
}
