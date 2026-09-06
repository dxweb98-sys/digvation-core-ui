import { useQuery } from '@tanstack/react-query';
import { PRODUCT_QUERY_KEYS } from '../data/product-query-keys';
import { productDataSource } from './use-product-list';

export function useProductDetail(productId: string) {
  return useQuery({ queryKey: PRODUCT_QUERY_KEYS.detail(productId), queryFn: () => productDataSource.getProductDetail(productId), enabled: Boolean(productId) });
}
