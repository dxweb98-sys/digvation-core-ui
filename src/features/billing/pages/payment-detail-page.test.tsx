import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, mockFetch } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { PaymentDetailPage } from './payment-detail-page';

const payment = {
  id: 'pay-1',
  client: { id: 'client-1', code: 'NOVA', name: 'Nova' },
  received_at: '2026-11-10',
  amount: '50000000',
  currency: 'IDR',
  method: 'BANK_TRANSFER',
  reference: 'BCA 1',
  notes: null,
  status: 'RECORDED',
  unallocated: '50000000',
  has_proof: false,
  proof_content_type: null,
  proof_sha256: null,
  reversed_at: null,
  allocations: [],
  created_at: '2026-11-10T03:00:00Z',
};

const openInvoice = {
  id: 'inv-1',
  number: 'INV/2026/11/00001',
  client: { id: 'client-1', code: 'NOVA', name: 'Nova' },
  brand: { id: 'brand-1', code: 'NOVA', name: 'Nova' },
  currency: 'IDR',
  status: 'ISSUED',
  balance: '44400000',
};

afterEach(() => vi.unstubAllGlobals());

describe('payment page', () => {
  it('limits an allocation to the invoice balance and sends minor units', async () => {
    const { calls } = mockFetch((call) => {
      if (call.url.endsWith('/authorization/me')) {
        return envelope({ roles: [], permissions: ['billing.read', 'payments.manage'] });
      }
      if (call.url.includes('/invoices?')) {
        return envelope({ items: [openInvoice], pagination: { page: 1, limit: 100, total: 1, total_pages: 1 } });
      }
      return envelope(payment);
    });
    renderApp(<PaymentDetailPage />, { path: '/payments/:paymentId', route: '/payments/pay-1' });

    fireEvent.click(await screen.findByRole('button', { name: 'Alokasikan' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByText('Pilih salah satu').closest('button')!);
    fireEvent.click((await screen.findAllByText(/INV\/2026\/11\/00001/)).at(-1)!);
    const amount = within(dialog).getByRole('textbox', { name: /jumlah/i });

    fireEvent.change(amount, { target: { value: '450.000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Alokasikan' }));
    expect(await within(dialog).findByText('Melebihi sisa invoice.')).toBeInTheDocument();

    fireEvent.change(amount, { target: { value: '444.000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Alokasikan' }));
    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true));
    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ invoice_id: 'inv-1', amount: '44400000' });
  });
});
