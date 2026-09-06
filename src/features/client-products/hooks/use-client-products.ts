import { useQuery } from '@tanstack/react-query';
import { CLIENT_PRODUCT_QUERY_KEYS } from '../data/client-product-query-keys';
import { resolveClientProductDataSource } from '../data/resolve-client-product-data-source';

export const clientProductDataSource = resolveClientProductDataSource();

export function useClientProducts(clientId: string) {
  return useQuery({
    queryKey: CLIENT_PRODUCT_QUERY_KEYS.clientProducts(clientId),
    queryFn: () => clientProductDataSource.getClientProducts(clientId),
    enabled: Boolean(clientId),
  });
}

export function useAssignableProducts(clientId: string) {
  return useQuery({
    queryKey: CLIENT_PRODUCT_QUERY_KEYS.assignableProducts(clientId),
    queryFn: () => clientProductDataSource.getAssignableProducts(clientId),
    enabled: Boolean(clientId),
  });
}

export function useProductClients(productId: string) {
  return useQuery({
    queryKey: CLIENT_PRODUCT_QUERY_KEYS.productClients(productId),
    queryFn: () => clientProductDataSource.getProductClients(productId),
    enabled: Boolean(productId),
  });
}
