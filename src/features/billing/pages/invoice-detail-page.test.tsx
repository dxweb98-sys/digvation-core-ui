import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { InvoiceDetailPage } from './invoice-detail-page';

const invoice = {
  id: 'inv-1',
  number: 'INV/2026/11/00001',
  client: { id: 'client-1', code: 'NOVA', name: 'Nova' },
  brand: { id: 'brand-1', code: 'NOVA', name: 'Nova' },
  currency: 'IDR',
  status: 'ISSUED',
  overdue: true,
  period_start: '2026-11-01',
  period_end: '2026-11-30',
  issue_date: '2026-11-01',
  due_date: '2026-11-15',
  subtotal: '40000000',
  tax_name: 'PPN',
  tax_rate_basis_points: 1100,
  tax_amount: '4400000',
  total: '44400000',
  amount_paid: '0',
  credited_amount: '0',
  balance: '44400000',
  voided_at: null,
  issued_at: '2026-11-01T02:00:00Z',
  pdf_sha256: 'abc',
  created_at: '2026-10-25T00:00:00Z',
  updated_at: '2026-11-01T02:00:00Z',
  lines: [
    {
      id: 'line-1',
      kind: 'TERM_CHARGE',
      description: 'POS Salon (bulanan)',
      source_key: 'term:1:1',
      service_id: 's',
      term_id: 't',
      one_off_charge_id: null,
      contract_add_on_id: null,
      period_start: '2026-11-01',
      period_end: '2026-11-30',
      quantity: 1,
      unit_amount: '40000000',
      amount: '40000000',
    },
  ],
  deliveries: [],
  allocations: [],
  credit_notes: [],
  snapshot: { billing_contacts: [{ email: 'finance@nova.id' }] },
};

const route = { path: '/invoices/:invoiceId', route: '/invoices/inv-1' };

afterEach(() => vi.unstubAllGlobals());

describe('invoice page', () => {
  it('shows totals in rupiah, overdue, and offers only the PDF to a reader', async () => {
    mockFetch((call) => {
      if (call.url.endsWith('/authorization/me')) return envelope({ roles: [], permissions: ['billing.read'] });
      return envelope(invoice);
    });
    renderApp(<InvoiceDetailPage />, route);

    expect(await screen.findByRole('heading', { name: 'INV/2026/11/00001' })).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 444.000').length).toBeGreaterThan(0);
    expect(screen.getByText('PPN 11%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument();
  });

  it('downloads the PDF through the API client with the bearer session', async () => {
    const createObjectURL = vi.fn(() => 'blob:pdf');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const { calls } = mockFetch((call) => {
      if (call.url.endsWith('/authorization/me')) return envelope({ roles: [], permissions: ['billing.read'] });
      if (call.url.endsWith('/pdf')) return new Response(new Blob(['%PDF']), { headers: { 'Content-Type': 'application/pdf' } });
      return envelope(invoice);
    });
    renderApp(<InvoiceDetailPage />, route);

    fireEvent.click(await screen.findByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(calls.some((call) => call.url.endsWith('/invoices/inv-1/pdf'))).toBe(true);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('explains why CORE refuses to void an invoice with allocations', async () => {
    const { calls } = mockFetch((call) => {
      if (call.url.endsWith('/authorization/me')) return envelope({ roles: [], permissions: ['billing.read', 'billing.manage'] });
      if (call.url.endsWith('/void')) return failure(409, 'INVOICE_HAS_ALLOCATIONS');
      return envelope(invoice);
    });
    renderApp(<InvoiceDetailPage />, route);

    fireEvent.click(await screen.findByRole('button', { name: 'Void' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Wrong client' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Void' }));

    expect(await within(dialog).findByText('Lepas dulu alokasi pembayaran dari invoice ini.')).toBeInTheDocument();
    expect(calls.find((call) => call.url.endsWith('/void'))?.body).toEqual({ reason: 'Wrong client' });
  });
});
