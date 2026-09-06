import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CLIENT_QUERY_KEYS } from '../data/client-query-keys';
import type {
  ClientStatusTransitionInput,
  CreateClientInput,
  UpdateClientInput,
} from '../types/client';
import { clientDataSource } from './use-client-list';

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClientInput) => clientDataSource.createClient(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
  });
}

export function useUpdateClient(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateClientInput) => clientDataSource.updateClient(clientId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
  });
}

export function useClientStatusTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClientStatusTransitionInput) =>
      clientDataSource.transitionClientStatus(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all }),
  });
}
