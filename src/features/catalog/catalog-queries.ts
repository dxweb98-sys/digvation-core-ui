import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Query } from '../../shared/api/client';
import { catalogApi, type CatalogKind } from './catalog-api';

export const catalogKeys = {
  all: ['catalog'] as const,
  products: (query?: Query) => ['catalog', 'products', query ?? {}] as const,
  product: (productId: string) => ['catalog', 'product', productId] as const,
  items: (kind: CatalogKind, query?: Query) => ['catalog', 'items', kind, query ?? {}] as const,
  productPart: (productId: string, part: string) => ['catalog', 'product', productId, part] as const,
};

export function useProducts(query: Query, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.products(query),
    queryFn: () => catalogApi.products(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useProduct(productId: string) {
  return useQuery({ queryKey: catalogKeys.product(productId), queryFn: () => catalogApi.product(productId) });
}

export function useCatalogItems(kind: CatalogKind, query: Query, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.items(kind, query),
    queryFn: () => catalogApi.items(kind, query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

function useProductPart<T>(productId: string, part: string, load: () => Promise<{ items: T[] }>, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.productPart(productId, part),
    queryFn: async () => (await load()).items,
    enabled: enabled && Boolean(productId),
  });
}

export const useFeatures = (productId: string, enabled = true) =>
  useProductPart(productId, 'features', () => catalogApi.features(productId), enabled);
export const useProductCapabilities = (productId: string, enabled = true) =>
  useProductPart(productId, 'capabilities', () => catalogApi.capabilities(productId), enabled);
export const useAddOns = (productId: string, enabled = true) =>
  useProductPart(productId, 'add-ons', () => catalogApi.addOns(productId), enabled);
export const usePrices = (productId: string, enabled = true) =>
  useProductPart(productId, 'prices', () => catalogApi.prices(productId), enabled);
export const useReleases = (productId: string, enabled = true) =>
  useProductPart(productId, 'releases', () => catalogApi.releases(productId), enabled);

/** Active products as picker options. */
export function useActiveProductOptions(enabled = true) {
  return useQuery({
    queryKey: catalogKeys.products({ status: 'ACTIVE', limit: 100, page: 1 }),
    queryFn: () => catalogApi.products({ status: 'ACTIVE', limit: 100, page: 1 }),
    select: (page) => page.items.map((product) => ({ value: product.id, label: `${product.name} (${product.code})` })),
    enabled,
  });
}
