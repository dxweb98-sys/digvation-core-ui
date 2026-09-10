import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CAPABILITY_QUERY_KEYS } from '../data/capability-query-keys';
import type {
  CapabilityStatusTransitionInput,
  CreateCapabilityInput,
  UpdateCapabilityInput,
} from '../types/capability';
import { capabilityDataSource } from './use-capability-list';

function invalidateCapabilities(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: CAPABILITY_QUERY_KEYS.all });
}

export function useCreateCapability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCapabilityInput) => capabilityDataSource.createCapability(input),
    onSuccess: () => invalidateCapabilities(queryClient),
  });
}

export function useUpdateCapability(capabilityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCapabilityInput) =>
      capabilityDataSource.updateCapability(capabilityId, input),
    onSuccess: () => invalidateCapabilities(queryClient),
  });
}

export function useCapabilityStatusTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CapabilityStatusTransitionInput) =>
      capabilityDataSource.transitionCapabilityStatus(input),
    onSuccess: () => invalidateCapabilities(queryClient),
  });
}
