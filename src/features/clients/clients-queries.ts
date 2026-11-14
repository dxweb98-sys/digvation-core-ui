import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Query } from '../../shared/api/client';
import { clientsApi } from './clients-api';

export const clientKeys = {
  all: ['clients'] as const,
  list: (query?: Query) => ['clients', 'list', query ?? {}] as const,
  detail: (clientId: string) => ['clients', 'detail', clientId] as const,
  brands: (clientId: string) => ['clients', 'brands', clientId] as const,
};

export function useClients(query: Query, enabled = true) {
  return useQuery({
    queryKey: clientKeys.list(query),
    queryFn: () => clientsApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useClient(clientId: string) {
  return useQuery({ queryKey: clientKeys.detail(clientId), queryFn: () => clientsApi.detail(clientId) });
}

/** Brands with the billing contacts invoices will use. */
export function useBrands(clientId: string, enabled = true) {
  return useQuery({
    queryKey: clientKeys.brands(clientId),
    queryFn: async () => (await clientsApi.brands(clientId)).items,
    enabled: enabled && Boolean(clientId),
  });
}

/** Active clients as options for pickers in other areas. */
export function useClientOptions(enabled = true) {
  return useQuery({
    queryKey: clientKeys.list({ status: 'ACTIVE', limit: 100, page: 1 }),
    queryFn: () => clientsApi.list({ status: 'ACTIVE', limit: 100, page: 1 }),
    select: (page) => page.items.map((client) => ({ value: client.id, label: `${client.display_name} (${client.code})` })),
    enabled,
  });
}
