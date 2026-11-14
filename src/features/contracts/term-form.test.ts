import { describe, expect, it } from 'vitest';
import { initialFormValues, validateForm } from '../../shared/forms/form-spec';
import type { Price } from '../catalog/catalog-api';
import { renewalChanged, type Term } from './contracts-api';
import { termBody, termFields, termFormValues } from './term-form';

const prices: Price[] = [
  { id: 'p1', billing_cycle: 'MONTHLY', currency: 'IDR', amount: '40000000', created_at: '', updated_at: '' },
];

function values(overrides: Record<string, string | boolean>) {
  const fields = termFields(prices, 'MONTHLY');
  return { fields, values: { ...initialFormValues(fields, termFormValues()), ...overrides } };
}

describe('term form', () => {
  it('sends a dated term with a duration in minor units', () => {
    const { values: form } = values({ starts_on: '2026-12-01', agreed_amount: '400.000' });
    expect(termBody(form)).toMatchObject({
      starts_at_go_live: false,
      starts_on: '2026-12-01',
      ends_on: null,
      duration_value: 12,
      duration_unit: 'MONTH',
      billing_cycle: 'MONTHLY',
      currency: 'IDR',
      agreed_amount: '40000000',
      adjustment_type: 'NONE',
      payment_terms_days: 14,
      planned_renewal_amount: null,
    });
  });

  it('sends a go-live term without dates', () => {
    const { values: form } = values({ start_mode: 'GO_LIVE', starts_on: '2026-12-01', agreed_amount: '400000' });
    expect(termBody(form)).toMatchObject({ starts_at_go_live: true, starts_on: null, ends_on: null, duration_value: 12 });
  });

  it('asks for a reason when the agreed price differs from the list price', () => {
    const { fields, values: form } = values({ starts_on: '2026-12-01', agreed_amount: '350000' });
    expect(validateForm(fields, form).adjustment_reason).toBe('The price differs from the list price; give a reason.');
    const listed = { ...form, agreed_amount: '400000' };
    expect(validateForm(fields, listed)).toEqual({});
  });

  it('asks for a reason for any adjustment and checks the end date', () => {
    const { fields, values: form } = values({
      starts_on: '2026-12-01',
      end_mode: 'DATE',
      ends_on: '2026-11-30',
      agreed_amount: '400000',
      adjustment_type: 'PROMOTIONAL',
    });
    expect(validateForm(fields, form)).toEqual({
      ends_on: 'The last day must be on or after the first day.',
      adjustment_reason: 'Give a reason for the adjustment.',
    });
  });

  it('knows when a renewal draft changed from its prefill', () => {
    const draft = {
      status: 'DRAFT',
      renewed_from_id: 't0',
      prefilled_amount: '40000000',
      prefilled_cycle: 'MONTHLY',
      agreed_amount: '40000000',
      billing_cycle: 'MONTHLY',
    } as Term;
    expect(renewalChanged(draft)).toBe(false);
    expect(renewalChanged({ ...draft, agreed_amount: '45000000' })).toBe(true);
    expect(renewalChanged({ ...draft, billing_cycle: 'ANNUAL' })).toBe(true);
    expect(renewalChanged({ ...draft, renewed_from_id: null, agreed_amount: '1' })).toBe(false);
  });
});
