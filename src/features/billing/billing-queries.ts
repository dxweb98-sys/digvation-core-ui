import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Query } from '../../shared/api/client';
import { billingApi } from './billing-api';

export const billingKeys = {
  all: ['billing'] as const,
  settings: ['billing', 'settings'] as const,
  revisions: ['billing', 'settings', 'revisions'] as const,
  client: (clientId: string) => ['billing', 'client', clientId] as const,
  invoices: (query?: Query) => ['billing', 'invoices', query ?? {}] as const,
  invoice: (invoiceId: string) => ['billing', 'invoice', invoiceId] as const,
  payments: (query?: Query) => ['billing', 'payments', query ?? {}] as const,
  payment: (paymentId: string) => ['billing', 'payment', paymentId] as const,
  creditNotes: (query?: Query) => ['billing', 'credit-notes', query ?? {}] as const,
  exclusions: (brandId?: string) => ['billing', 'exclusions', brandId ?? ''] as const,
};

export const useBillingSettings = (enabled = true) =>
  useQuery({ queryKey: billingKeys.settings, queryFn: billingApi.settings, enabled });
export const useSettingsRevisions = () =>
  useQuery({ queryKey: billingKeys.revisions, queryFn: async () => (await billingApi.settingsRevisions()).items });
export const useClientBilling = (clientId: string) =>
  useQuery({ queryKey: billingKeys.client(clientId), queryFn: () => billingApi.clientBilling(clientId) });

export function useInvoices(query: Query, enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoices(query),
    queryFn: () => billingApi.invoices(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}
export const useInvoice = (invoiceId: string) =>
  useQuery({ queryKey: billingKeys.invoice(invoiceId), queryFn: () => billingApi.invoice(invoiceId) });

export function usePayments(query: Query) {
  return useQuery({ queryKey: billingKeys.payments(query), queryFn: () => billingApi.payments(query), placeholderData: keepPreviousData });
}
export const usePayment = (paymentId: string) =>
  useQuery({ queryKey: billingKeys.payment(paymentId), queryFn: () => billingApi.payment(paymentId) });

export function useCreditNotes(query: Query) {
  return useQuery({
    queryKey: billingKeys.creditNotes(query),
    queryFn: () => billingApi.creditNotes(query),
    placeholderData: keepPreviousData,
  });
}

export const useExclusions = (brandId?: string, enabled = true) =>
  useQuery({
    queryKey: billingKeys.exclusions(brandId),
    queryFn: async () => (await billingApi.exclusions(brandId)).items,
    enabled,
  });
