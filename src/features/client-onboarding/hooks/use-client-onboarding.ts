import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientOnboardingDataSource } from '../data/client-onboarding-data-source';
import type { CreateClientOnboardingRequest } from '../types/client-onboarding';

const ONBOARDING_KEY = ['client-onboardings'] as const;

export function useCreateOrResumeClientOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientOnboardingRequest) =>
      clientOnboardingDataSource.createOrResume(input),
    onSuccess: (result) => {
      queryClient.setQueryData([...ONBOARDING_KEY, result.onboardingId], result);
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      void queryClient.invalidateQueries({ queryKey: ['client-products'] });
      void queryClient.invalidateQueries({ queryKey: ['client-capabilities'] });
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      void queryClient.invalidateQueries({ queryKey: ['installations'] });
    },
  });
}

export function useClientOnboarding(onboardingId?: string) {
  return useQuery({
    queryKey: [...ONBOARDING_KEY, onboardingId],
    queryFn: () => clientOnboardingDataSource.get(onboardingId!),
    enabled: Boolean(onboardingId),
  });
}
