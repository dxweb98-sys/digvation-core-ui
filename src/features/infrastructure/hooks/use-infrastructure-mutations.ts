import { useMutation, useQueryClient } from '@tanstack/react-query';
import { INFRASTRUCTURE_QUERY_KEYS } from '../data/infrastructure-query-keys';
import { infrastructureDataSource } from './use-infrastructure';
import type { CreateInfrastructureNodeInput, CreateInstallationBindingInput, UpdateInfrastructureNodeInput } from '../types/infrastructure';
function invalidate(queryClient: ReturnType<typeof useQueryClient>) { return queryClient.invalidateQueries({ queryKey: INFRASTRUCTURE_QUERY_KEYS.all }); }
export function useCreateInfrastructureNode() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: CreateInfrastructureNodeInput) => infrastructureDataSource.createInfrastructureNode(input), onSuccess: () => invalidate(queryClient) }); }
export function useUpdateInfrastructureNode(nodeId: string) { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: UpdateInfrastructureNodeInput) => infrastructureDataSource.updateInfrastructureNode(nodeId, input), onSuccess: () => invalidate(queryClient) }); }
export function useBindInstallation() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: CreateInstallationBindingInput) => infrastructureDataSource.bindInstallation(input), onSuccess: () => invalidate(queryClient) }); }
export function useRemoveInstallationBinding() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (bindingId: string) => infrastructureDataSource.removeInstallationBinding(bindingId), onSuccess: () => invalidate(queryClient) }); }
