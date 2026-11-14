import { describe, expect, it } from 'vitest';
import { validateForm } from '../../shared/forms/form-spec';
import { SETTINGS_FIELDS, formatPercent, overlappingRates, percentToBasisPoints } from './billing-settings-form';
import { PROOF_MAX_BYTES, proofProblem } from './payment-rules';

describe('billing settings rules', () => {
  it('turns a typed percentage into basis points', () => {
    expect(percentToBasisPoints('11')).toBe(1100);
    expect(percentToBasisPoints('11,5')).toBe(1150);
    expect(percentToBasisPoints('101')).toBeUndefined();
    expect(percentToBasisPoints('abc')).toBeUndefined();
    expect(formatPercent(1150)).toBe('11,5%');
  });

  it('detects overlapping tax periods, including an open one', () => {
    const ppn11 = { name: 'PPN', rate_basis_points: 1100, valid_from: '2025-01-01', valid_until: '2025-12-31' };
    const ppn12 = { name: 'PPN', rate_basis_points: 1200, valid_from: '2026-01-01', valid_until: null };
    expect(overlappingRates([ppn12, ppn11])).toBe(false);
    expect(overlappingRates([{ ...ppn11, valid_until: null }, ppn12])).toBe(true);
    expect(overlappingRates([{ ...ppn11, valid_until: '2026-01-01' }, ppn12])).toBe(true);
  });

  it('checks number patterns for one sequence and known tokens', () => {
    const values = {
      issuer_legal_name: 'PT Digvation',
      issuer_email: 'billing@digvation.id',
      issuer_phone: '+62',
      draft_lead_days: '7',
      issuer_address: 'Jakarta',
      payment_instructions: 'Transfer',
      reason: 'Setup',
      invoice_number_pattern: 'INV/{YYYY}/{MM}',
      credit_note_number_pattern: 'CN/{YEAR}/{SEQ:5}',
    };
    expect(validateForm(SETTINGS_FIELDS, values)).toEqual({
      invoice_number_pattern: 'Use exactly one {SEQ:n} token.',
      credit_note_number_pattern: 'Unknown token {YEAR}. Use {YYYY}, {MM}, {BRAND} and {SEQ:n}.',
    });
    expect(
      validateForm(SETTINGS_FIELDS, { ...values, invoice_number_pattern: 'INV/{BRAND}/{SEQ:4}', credit_note_number_pattern: 'CN/{YYYY}/{SEQ:5}' }),
    ).toEqual({});
  });

  it('catches the obvious proof file problems before upload', () => {
    expect(proofProblem(null)).toBe('Choose a file.');
    expect(proofProblem(new File(['x'], 'proof.txt', { type: 'text/plain' }))).toBe('Use a PDF, JPG or PNG file.');
    const big = new File([new Uint8Array(PROOF_MAX_BYTES + 1)], 'proof.pdf', { type: 'application/pdf' });
    expect(proofProblem(big)).toBe('The file is larger than 5 MB.');
    expect(proofProblem(new File(['%PDF'], 'proof.pdf', { type: 'application/pdf' }))).toBeUndefined();
  });
});
