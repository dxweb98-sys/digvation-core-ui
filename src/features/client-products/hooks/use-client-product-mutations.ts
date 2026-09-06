import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CLIENT_PRODUCT_QUERY_KEYS } from '../data/client-product-query-keys';
import type { AssignClientProductInput, ClientProductStatusTransitionInput } from '../types/client-product';
import { clientProductDataSource } from './use-client-products';

function invalidateClientProducts(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: CLIENT_PRODUCT_QUERY_KEYS.all });
}

export function useAssignClientProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignClientProductInput) => clientProductDataSource.assignProduct(input),
    onSuccess: () => invalidateClientProducts(queryClient),
  });
}

export function useClientProductStatusTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientProductStatusTransitionInput) => clientProductDataSource.transitionClientProductStatus(input),
    onSuccess: () => invalidateClientProducts(queryClient),
  });
}
