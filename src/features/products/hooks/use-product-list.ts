import { useQuery } from '@tanstack/react-query';
import { PRODUCT_QUERY_KEYS } from '../data/product-query-keys';
import { resolveProductDataSource } from '../data/resolve-product-data-source';
import type { ProductListQuery } from '../types/product';

const productDataSource = resolveProductDataSource();

export function useProductList(query: ProductListQuery) {
  return useQuery({ queryKey: PRODUCT_QUERY_KEYS.list(query), queryFn: () => productDataSource.getProducts(query) });
}

export { productDataSource };
