import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CLIENT_CAPABILITY_QUERY_KEYS } from '../data/client-capability-query-keys';
import type {
  AssignClientCapabilityInput,
  ClientCapabilityStatusTransitionInput,
} from '../types/client-capability';
import { clientCapabilityDataSource } from './use-client-capabilities';

export function useAssignClientCapability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignClientCapabilityInput) =>
      clientCapabilityDataSource.assignClientCapability(input),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({
        queryKey: CLIENT_CAPABILITY_QUERY_KEYS.client(input.clientId),
      }),
  });
}

export function useClientCapabilityStatusTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientCapabilityStatusTransitionInput) =>
      clientCapabilityDataSource.transitionClientCapabilityStatus(input),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({
        queryKey: CLIENT_CAPABILITY_QUERY_KEYS.client(input.clientId),
      }),
  });
}
