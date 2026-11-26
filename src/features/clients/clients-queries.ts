import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Query } from '../../shared/api/client';
import { clientsApi } from './clients-api';

export const clientKeys = {
  all: ['clients'] as const,
  list: (query?: Query) => ['clients', 'list', query ?? {}] as const,
  detail: (clientId: string) => ['clients', 'detail', clientId] as const,
  brand: (clientId: string, brandId: string) => ['clients', 'detail', clientId, 'brand', brandId] as const,
  businessTypes: ['business-types', 'active'] as const,
};

export function useClients(query: Query) {
  return useQuery({
    queryKey: clientKeys.list(query),
    queryFn: () => clientsApi.list(query),
    placeholderData: keepPreviousData,
  });
}

/** One GET /clients/{id} feeds the client page and its business pages. */
export function useClient(clientId: string) {
  return useQuery({ queryKey: clientKeys.detail(clientId), queryFn: () => clientsApi.detail(clientId) });
}

export function useBrand(clientId: string, brandId: string) {
  return useQuery({ queryKey: clientKeys.brand(clientId, brandId), queryFn: () => clientsApi.brand(clientId, brandId) });
}

export function useActiveBusinessTypes(enabled: boolean) {
  return useQuery({
    queryKey: clientKeys.businessTypes,
    queryFn: async () => (await clientsApi.activeBusinessTypes()).items,
    enabled,
    staleTime: 5 * 60_000,
  });
}
