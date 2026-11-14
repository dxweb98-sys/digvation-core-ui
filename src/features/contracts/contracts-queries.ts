import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Query } from '../../shared/api/client';
import { contractsApi } from './contracts-api';

export const contractKeys = {
  all: ['contracts'] as const,
  list: (query?: Query) => ['contracts', 'list', query ?? {}] as const,
  detail: (contractId: string) => ['contracts', 'detail', contractId] as const,
};

export function useContracts(query: Query, enabled = true) {
  return useQuery({
    queryKey: contractKeys.list(query),
    queryFn: () => contractsApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useContract(contractId: string) {
  return useQuery({ queryKey: contractKeys.detail(contractId), queryFn: () => contractsApi.detail(contractId) });
}

/** The contract of one service, if it has one (a service has at most one). */
export function useServiceContract(clientId: string, serviceId: string, enabled = true) {
  return useQuery({
    queryKey: contractKeys.list({ client_id: clientId, limit: 100, page: 1 }),
    queryFn: () => contractsApi.list({ client_id: clientId, limit: 100, page: 1 }),
    select: (page) => page.items.find((contract) => contract.service.id === serviceId) ?? null,
    enabled,
  });
}
