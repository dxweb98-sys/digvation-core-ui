import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Query } from '../../shared/api/client';
import { servicesApi } from './services-api';

export const serviceKeys = {
  all: ['services'] as const,
  list: (query?: Query) => ['services', 'list', query ?? {}] as const,
  ofClient: (clientId: string) => ['services', 'client', clientId] as const,
  detail: (clientId: string, serviceId: string) => ['services', 'detail', clientId, serviceId] as const,
};

export function useAllServices(query: Query) {
  return useQuery({
    queryKey: serviceKeys.list(query),
    queryFn: () => servicesApi.all(query),
    placeholderData: keepPreviousData,
  });
}

export function useClientServices(clientId: string, enabled = true) {
  return useQuery({
    queryKey: serviceKeys.ofClient(clientId),
    queryFn: async () => (await servicesApi.ofClient(clientId)).items,
    enabled: enabled && Boolean(clientId),
  });
}

export function useService(clientId: string, serviceId: string) {
  return useQuery({
    queryKey: serviceKeys.detail(clientId, serviceId),
    queryFn: () => servicesApi.detail(clientId, serviceId),
  });
}
