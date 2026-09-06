import { useQuery } from '@tanstack/react-query';
import { CLIENT_QUERY_KEYS } from '../data/client-query-keys';
import { clientDataSource } from './use-client-list';

export function useClientDetail(clientId: string) {
  return useQuery({
    queryKey: CLIENT_QUERY_KEYS.detail(clientId),
    queryFn: () => clientDataSource.getClientDetail(clientId),
    enabled: Boolean(clientId),
  });
}
