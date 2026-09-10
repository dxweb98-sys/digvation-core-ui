import type { ProductListQuery } from '../types/product';

export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  list: (query: ProductListQuery) => ['products', 'list', query] as const,
  detail: (productId: string) => ['products', 'detail', productId] as const,
  capabilities: ['products', 'capability-catalog'] as const,
};
