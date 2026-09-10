import { useQuery } from '@tanstack/react-query';
import { CAPABILITY_QUERY_KEYS } from '../data/capability-query-keys';
import { resolveCapabilityDataSource } from '../data/resolve-capability-data-source';
import type { CapabilityListQuery } from '../types/capability';

export const capabilityDataSource = resolveCapabilityDataSource();

export function useCapabilityList(query: CapabilityListQuery) {
  return useQuery({
    queryKey: CAPABILITY_QUERY_KEYS.list(query),
    queryFn: () => capabilityDataSource.getCapabilities(query),
  });
}
