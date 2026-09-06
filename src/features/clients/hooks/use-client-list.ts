import { useQuery } from '@tanstack/react-query';
import { CLIENT_QUERY_KEYS } from '../data/client-query-keys';
import { resolveClientDataSource } from '../data/resolve-client-data-source';
import type { ClientListQuery } from '../types/client';

const clientDataSource = resolveClientDataSource();

export function useClientList(query: ClientListQuery) {
  return useQuery({
    queryKey: CLIENT_QUERY_KEYS.list(query),
    queryFn: () => clientDataSource.getClients(query),
  });
}

export { clientDataSource };
