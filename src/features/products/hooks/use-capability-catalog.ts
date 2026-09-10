import { useQuery } from '@tanstack/react-query';
import { PRODUCT_QUERY_KEYS } from '../data/product-query-keys';
import { productDataSource } from './use-product-list';

export function useCapabilityCatalog() {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.capabilities,
    queryFn: () => productDataSource.getCapabilities(),
  });
}
