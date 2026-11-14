import { api, apiFile, seg, type Query } from '../../shared/api/client';
import type { Dto } from '../../shared/api/types';

export type BillingSettings = Dto<'BillingSettingsDto'>;
export type TaxRate = Dto<'TaxRateDto'>;
export type Invoice = Dto<'InvoiceDto'>;
export type InvoiceDetail = Dto<'InvoiceDetailDto'>;
export type InvoiceLine = Dto<'InvoiceLineDto'>;
export type InvoiceStatus = Invoice['status'];
export type Payment = Dto<'PaymentDto'>;
export type PaymentAllocation = Dto<'PaymentAllocationDto'>;
export type CreditNote = Dto<'CreditNoteDto'>;
export type SourceExclusion = Dto<'InvoiceSourceExclusionDto'>;

/** An invoice that still waits for money. */
export function isOpenInvoice(status: InvoiceStatus) {
  return status === 'ISSUED' || status === 'PARTIALLY_PAID';
}

const invoice = (invoiceId: string) => `/invoices/${seg(invoiceId)}`;
const payment = (paymentId: string) => `/payments/${seg(paymentId)}`;

export const billingApi = {
  settings: () => api.get<BillingSettings>('/billing/settings'),
  saveSettings: (body: Dto<'UpdateBillingSettingsDto'>) => api.put<BillingSettings>('/billing/settings', body),
  settingsRevisions: () => api.get<Dto<'BillingSettingsRevisionListDto'>>('/billing/settings/revisions'),
  clientBilling: (clientId: string) => api.get<Dto<'ClientBillingDto'>>(`/billing/clients/${seg(clientId)}`),
  exclusions: (brandId?: string) =>
    api.get<Dto<'InvoiceSourceExclusionListDto'>>('/billing/source-exclusions', { brand_id: brandId }),
  restoreExclusion: (exclusionId: string, reason: string) =>
    api.post<SourceExclusion>(`/billing/source-exclusions/${seg(exclusionId)}/restore`, { reason }),

  invoices: (query: Query) => api.list<Invoice>('/invoices', query),
  invoice: (invoiceId: string) => api.get<InvoiceDetail>(invoice(invoiceId)),
  createDraft: (body: Dto<'CreateInvoiceDraftDto'>) => api.post<InvoiceDetail>('/invoices', body),
  deleteDraft: (invoiceId: string) => api.delete(invoice(invoiceId)),
  addLine: (invoiceId: string, body: Dto<'AddInvoiceLineDto'>) => api.post<InvoiceDetail>(`${invoice(invoiceId)}/lines`, body),
  removeLine: (invoiceId: string, lineId: string, reason: string) =>
    api.post<InvoiceDetail>(`${invoice(invoiceId)}/lines/${seg(lineId)}/remove`, { reason }),
  issue: (invoiceId: string, reason?: string) =>
    api.post<InvoiceDetail>(`${invoice(invoiceId)}/issue`, reason ? { reason } : {}),
  send: (invoiceId: string) => api.post<Dto<'InvoiceDeliveryDto'>>(`${invoice(invoiceId)}/send`),
  void: (invoiceId: string, reason: string) => api.post<InvoiceDetail>(`${invoice(invoiceId)}/void`, { reason }),
  invoicePdf: (invoiceId: string) => apiFile(`${invoice(invoiceId)}/pdf`),
  createCreditNote: (invoiceId: string, body: Dto<'CreateCreditNoteDto'>) =>
    api.post<CreditNote>(`${invoice(invoiceId)}/credit-notes`, body),

  payments: (query: Query) => api.list<Payment>('/payments', query),
  payment: (paymentId: string) => api.get<Payment>(payment(paymentId)),
  recordPayment: (body: Dto<'CreatePaymentDto'>) => api.post<Payment>('/payments', body),
  allocate: (paymentId: string, body: Dto<'AllocatePaymentDto'>) => api.post<Payment>(`${payment(paymentId)}/allocations`, body),
  release: (paymentId: string, allocationId: string, reason: string) =>
    api.post<Payment>(`${payment(paymentId)}/allocations/${seg(allocationId)}/release`, { reason }),
  reverse: (paymentId: string, reason: string) => api.post<Payment>(`${payment(paymentId)}/reverse`, { reason }),
  uploadProof: (paymentId: string, file: File) => api.upload<Payment>(`${payment(paymentId)}/proof`, file),
  proof: (paymentId: string) => apiFile(`${payment(paymentId)}/proof`),

  creditNotes: (query: Query) => api.list<CreditNote>('/credit-notes', query),
  creditNotePdf: (creditNoteId: string) => apiFile(`/credit-notes/${seg(creditNoteId)}/pdf`),
  sendCreditNote: (creditNoteId: string) => api.post(`/credit-notes/${seg(creditNoteId)}/send`),
};
