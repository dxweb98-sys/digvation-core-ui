import { useQuery } from '@tanstack/react-query';
import { PRODUCT_MAPPING_VOCABULARY_QUERY_KEY } from '../data/product-query-keys';
import { productDataSource } from './use-product-list';

/** The vocabulary is fixed for a CORE build, so one fetch serves the whole session. */
export function useMappingVocabulary() {
  return useQuery({
    queryKey: PRODUCT_MAPPING_VOCABULARY_QUERY_KEY,
    queryFn: () => productDataSource.getMappingVocabulary(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
