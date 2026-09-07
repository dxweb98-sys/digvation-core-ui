import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resolveSubscriptionDataSource } from '../data/resolve-subscription-data-source';
import type { InitialSubscriptionInput, ProductConfiguration, RenewalTermInput } from '../types/subscription';
const subscriptionDataSource = resolveSubscriptionDataSource(); const KEY = ['subscriptions'] as const;
export function useClientCommercial(clientId: string) { return useQuery({ queryKey: [...KEY, clientId], queryFn: () => subscriptionDataSource.getClientCommercialSummary(clientId), enabled: Boolean(clientId) }); }
export function useCreateInitialSubscription() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: InitialSubscriptionInput) => subscriptionDataSource.createInitialSubscription(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) }); }
export function useAddRenewalTerm() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ subscriptionId, input }: { subscriptionId: string; input: RenewalTermInput }) => subscriptionDataSource.addRenewalTerm(subscriptionId, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) }); }
export function useUpdateProductConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ clientProductId, configurations }: { clientProductId: string; configurations: ProductConfiguration[] }) => subscriptionDataSource.updateProductConfiguration(clientProductId, configurations), onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) }); }
