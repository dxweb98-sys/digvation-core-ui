import { useMutation, useQueryClient } from '@tanstack/react-query';
import { INSTALLATION_QUERY_KEYS } from '../data/installation-query-keys';
import type {
  CreateInstallationInput,
  InstallationStatusTransitionInput,
  ReplaceInstallationProductsInput,
  UpdateInstallationBrandingInput,
  UpdateInstallationInput,
} from '../types/installation';
import { installationDataSource } from './use-installations';

function invalidateInstallations(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: INSTALLATION_QUERY_KEYS.all });
}

export function useCreateInstallation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInstallationInput) => installationDataSource.createInstallation(input),
    onSuccess: () => invalidateInstallations(queryClient),
  });
}

export function useUpdateInstallation(installationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInstallationInput) => installationDataSource.updateInstallation(installationId, input),
    onSuccess: () => invalidateInstallations(queryClient),
  });
}

export function useReplaceInstallationProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReplaceInstallationProductsInput) => installationDataSource.replaceInstallationProducts(input),
    onSuccess: () => invalidateInstallations(queryClient),
  });
}

export function useUpdateInstallationBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInstallationBrandingInput) => installationDataSource.updateInstallationBranding(input),
    onSuccess: () => invalidateInstallations(queryClient),
  });
}

export function useInstallationStatusTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InstallationStatusTransitionInput) => installationDataSource.transitionInstallationStatus(input),
    onSuccess: () => invalidateInstallations(queryClient),
  });
}
