import type { ProductListQuery } from '../types/product';

/** Outside PRODUCT_QUERY_KEYS.all: product changes must not refetch it. */
export const PRODUCT_MAPPING_VOCABULARY_QUERY_KEY = [
  'product-mapping-vocabulary',
] as const;

export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  list: (query: ProductListQuery) => ['products', 'list', query] as const,
  detail: (productId: string) => ['products', 'detail', productId] as const,
};
