import { useQueries } from '@tanstack/react-query';

import { PRODUCT_QUERY_KEYS } from '../../products/data/product-query-keys';
import { productDataSource } from '../../products/hooks/use-product-list';
import type { ClientProductSummary } from '../../client-products/types/client-product';
import type { CompatibleClientCapability } from '../types/client-capability';

const COMPATIBLE_CLIENT_PRODUCT_STATUSES = new Set([
  'PROVISIONING',
  'TRIAL',
  'ACTIVE',
]);

export function useCompatibleClientCapabilities(
  clientProducts: ClientProductSummary[],
) {
  const eligibleProducts = clientProducts.filter((relationship) =>
    COMPATIBLE_CLIENT_PRODUCT_STATUSES.has(relationship.status),
  );
  const productQueries = useQueries({
    queries: eligibleProducts.map((relationship) => ({
      queryKey: PRODUCT_QUERY_KEYS.detail(relationship.productId),
      queryFn: () => productDataSource.getProductDetail(relationship.productId),
    })),
  });

  const compatibility = new Map<string, CompatibleClientCapability>();
  productQueries.forEach((query, index) => {
    const detail = query.data;
    const relationship = eligibleProducts[index];
    if (!detail || !relationship || detail.product.status !== 'ACTIVE') return;

    detail.capabilities.forEach((capability) => {
      const existing = compatibility.get(capability.id);
      if (existing) {
        if (!existing.productCodes.includes(relationship.productCode)) {
          existing.productCodes.push(relationship.productCode);
          existing.productCodes.sort();
        }
        return;
      }
      compatibility.set(capability.id, {
        capability: { ...capability },
        productCodes: [relationship.productCode],
      });
    });
  });

  return {
    items: [...compatibility.values()].sort((left, right) =>
      left.capability.code.localeCompare(right.capability.code),
    ),
    isPending: productQueries.some((query) => query.isPending),
    isError: productQueries.some((query) => query.isError),
    refetch: () => Promise.all(productQueries.map((query) => query.refetch())),
  };
}
