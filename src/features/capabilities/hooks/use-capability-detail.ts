import { useQuery } from '@tanstack/react-query';
import { CAPABILITY_QUERY_KEYS } from '../data/capability-query-keys';
import { capabilityDataSource } from './use-capability-list';

export function useCapabilityDetail(capabilityId: string) {
  return useQuery({
    queryKey: CAPABILITY_QUERY_KEYS.detail(capabilityId),
    queryFn: () => capabilityDataSource.getCapability(capabilityId),
    enabled: Boolean(capabilityId),
  });
}
