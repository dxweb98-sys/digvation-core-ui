import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resolveCommercialCatalogDataSource } from '../data/resolve-commercial-catalog-data-source';
import type {
  AddOnOfferingInput,
  AddOnOfferingTransitionInput,
  ReplaceAddOnOfferingGrantsInput,
  UpdateAddOnOfferingInput,
  UpsertCatalogPriceInput,
} from '../types/commercial-catalog';

const dataSource = resolveCommercialCatalogDataSource();
const KEY = ['commercial-catalog'] as const;

export function useProductPrices(productId: string) {
  return useQuery({
    queryKey: [...KEY, 'product-prices', productId],
    queryFn: () => dataSource.getProductPrices(productId),
    enabled: Boolean(productId),
  });
}

export function useProductAddOns(productId: string) {
  return useQuery({
    queryKey: [...KEY, 'product-add-ons', productId],
    queryFn: () => dataSource.getProductAddOns(productId),
    enabled: Boolean(productId),
  });
}

export function useUpsertProductPrice(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertCatalogPriceInput) =>
      dataSource.upsertProductPrice(productId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddOnOfferingInput) => dataSource.createAddOn(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAddOnOfferingInput) => dataSource.updateAddOn(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpsertAddOnPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      addOnOfferingId,
      input,
    }: {
      addOnOfferingId: string;
      input: UpsertCatalogPriceInput;
    }) => dataSource.upsertAddOnPrice(addOnOfferingId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReplaceAddOnGrants() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReplaceAddOnOfferingGrantsInput) =>
      dataSource.replaceAddOnGrants(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useTransitionAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddOnOfferingTransitionInput) =>
      dataSource.transitionAddOn(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
