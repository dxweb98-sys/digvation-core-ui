import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PRODUCT_QUERY_KEYS } from '../data/product-query-keys';
import type { CreateProductInput, ProductStatusTransitionInput, UpdateProductInput } from '../types/product';
import { productDataSource } from './use-product-list';

function invalidateProducts(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: CreateProductInput) => productDataSource.createProduct(input), onSuccess: () => invalidateProducts(queryClient) });
}

export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: UpdateProductInput) => productDataSource.updateProduct(productId, input), onSuccess: () => invalidateProducts(queryClient) });
}

export function useProductStatusTransition() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: ProductStatusTransitionInput) => productDataSource.transitionProductStatus(input), onSuccess: () => invalidateProducts(queryClient) });
}
