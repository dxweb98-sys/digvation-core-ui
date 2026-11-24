import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, mockFetch } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { openRowActions } from '../../../test/table';
import type { Contract, Term } from '../contracts-api';
import { TermsSection } from './terms-section';

const renewal: Term = {
  id: 'term-2',
  status: 'DRAFT',
  starts_on: '2027-01-01',
  ends_on: '2027-12-31',
  starts_at_go_live: false,
  duration_value: 12,
  duration_unit: 'MONTH',
  go_live_installation_id: null,
  billing_cycle: 'MONTHLY',
  currency: 'IDR',
  list_amount: '40000000',
  agreed_amount: '45000000',
  adjustment_type: 'NEGOTIATED',
  adjustment_reason: 'Hosting costs',
  payment_terms_days: 14,
  trial_ends_on: null,
  planned_renewal_amount: null,
  planned_renewal_cycle: null,
  renewed_from_id: 'term-1',
  prefilled_amount: '40000000',
  prefilled_cycle: 'MONTHLY',
  confirmed_at: null,
  activated_at: null,
  ended_at: null,
  one_off_charges: [],
  created_at: '2026-12-01T00:00:00Z',
  updated_at: '2026-12-01T00:00:00Z',
};

const contract = { id: 'contract-1', status: 'ACTIVE', terms: [renewal], add_ons: [] } as unknown as Contract;

afterEach(() => vi.unstubAllGlobals());

describe('renewal draft', () => {
  it('needs a reason to confirm a renewal whose price changed, and sends it', async () => {
    const { calls } = mockFetch(() => envelope({ message: 'ok', contract_id: 'contract-1', term_id: 'term-2', status: 'SCHEDULED' }));
    renderApp(<TermsSection contract={contract} prices={[]} canManage />);

    expect(screen.getAllByText('Draf perpanjangan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rp 450.000').length).toBeGreaterThan(0);
    await openRowActions(0);
    fireEvent.click(await screen.findByText('Konfirmasi'));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Konfirmasi term' }));
    expect(await within(dialog).findByText('Isi kolom ini.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Hosting costs went up' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Konfirmasi term' }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].url).toContain('/contracts/contract-1/terms/term-2/confirm');
    expect(calls[0].body).toEqual({ reason: 'Hosting costs went up' });
  });
});
