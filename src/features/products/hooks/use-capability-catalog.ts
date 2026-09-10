import { useQuery } from '@tanstack/react-query';
import { CAPABILITY_QUERY_KEYS } from '../../capabilities/data/capability-query-keys';
import { capabilityDataSource } from '../../capabilities/hooks/use-capability-list';

const PRODUCT_COMPATIBILITY_CATALOG_QUERY = {
  search: '',
  status: 'ALL' as const,
  page: 1,
  limit: 100,
};

export function useCapabilityCatalog() {
  return useQuery({
    queryKey: CAPABILITY_QUERY_KEYS.list(PRODUCT_COMPATIBILITY_CATALOG_QUERY),
    queryFn: async () => {
      const result = await capabilityDataSource.getCapabilities(
        PRODUCT_COMPATIBILITY_CATALOG_QUERY,
      );
      return result.capabilities;
    },
  });
}
