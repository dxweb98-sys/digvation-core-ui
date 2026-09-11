import { useQuery } from '@tanstack/react-query';

import { CLIENT_CAPABILITY_QUERY_KEYS } from '../data/client-capability-query-keys';
import { resolveClientCapabilityDataSource } from '../data/resolve-client-capability-data-source';

export const clientCapabilityDataSource = resolveClientCapabilityDataSource();

export function useClientCapabilities(clientId: string) {
  return useQuery({
    queryKey: CLIENT_CAPABILITY_QUERY_KEYS.client(clientId),
    queryFn: () => clientCapabilityDataSource.getClientCapabilities(clientId),
    enabled: Boolean(clientId),
  });
}
