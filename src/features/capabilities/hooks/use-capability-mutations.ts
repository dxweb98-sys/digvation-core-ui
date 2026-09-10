import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PRODUCT_QUERY_KEYS } from '../../products/data/product-query-keys';
import { CAPABILITY_QUERY_KEYS } from '../data/capability-query-keys';
import type {
  CapabilityStatusTransitionInput,
  CreateCapabilityInput,
  UpdateCapabilityInput,
} from '../types/capability';
import { capabilityDataSource } from './use-capability-list';

async function invalidateCapabilityConsumers(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: CAPABILITY_QUERY_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all }),
  ]);
}

export function useCreateCapability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCapabilityInput) =>
      capabilityDataSource.createCapability(input),
    onSuccess: () => invalidateCapabilityConsumers(queryClient),
  });
}

export function useUpdateCapability(capabilityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCapabilityInput) =>
      capabilityDataSource.updateCapability(capabilityId, input),
    onSuccess: () => invalidateCapabilityConsumers(queryClient),
  });
}

export function useCapabilityStatusTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CapabilityStatusTransitionInput) =>
      capabilityDataSource.transitionCapabilityStatus(input),
    onSuccess: () => invalidateCapabilityConsumers(queryClient),
  });
}
