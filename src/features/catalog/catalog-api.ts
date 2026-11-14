import { api, seg, type Query } from '../../shared/api/client';
import type { Dto } from '../../shared/api/types';

export type Product = Dto<'ProductDto'>;
export type ProductDetail = Dto<'ProductDetailDto'>;
export type CatalogItem = Dto<'CatalogItemDto'>;
export type CatalogStatus = CatalogItem['status'];
export type Feature = Dto<'FeatureDto'>;
export type ProductCapability = Dto<'ProductCapabilityDto'>;
export type AddOn = Dto<'AddOnDto'>;
export type Price = Dto<'PriceDto'>;
export type BillingCycle = Price['billing_cycle'];
export type Release = Dto<'ReleaseDto'>;
export type ReleaseStatus = Release['status'];

/** core-v2 catalog.lifecycle.ts: products, features, add-ons and catalog items. */
export const CATALOG_TRANSITIONS: Record<CatalogStatus, readonly CatalogStatus[]> = {
  DRAFT: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['RETIRED'],
  RETIRED: ['DRAFT'],
};

export const RELEASE_TRANSITIONS: Record<ReleaseStatus, readonly ReleaseStatus[]> = {
  DRAFT: ['RELEASED'],
  RELEASED: ['WITHDRAWN'],
  WITHDRAWN: [],
};

export const BILLING_CYCLES: readonly BillingCycle[] = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'PER_TERM'];

/** The three catalog item kinds share one contract under /catalog/{kind}. */
export type CatalogKind = 'capabilities' | 'applications' | 'base-domains';

type Transition = Dto<'CatalogLifecycleTransitionDto'>;
const product = (productId: string) => `/products/${seg(productId)}`;

export const catalogApi = {
  products: (query: Query) => api.list<Product>('/products', query),
  product: (productId: string) => api.get<ProductDetail>(product(productId)),
  createProduct: (body: Dto<'CreateProductDto'>) => api.post<Dto<'ProductMutationResponseDto'>>('/products', body),
  updateProduct: (productId: string, body: Dto<'UpdateProductDto'>) =>
    api.patch<Dto<'ProductMutationResponseDto'>>(product(productId), body),
  transitionProduct: (productId: string, body: Dto<'ProductLifecycleTransitionDto'>) =>
    api.patch(`${product(productId)}/status`, body),
  setApplications: (productId: string, ids: string[]) =>
    api.put(`${product(productId)}/applications`, { application_ids: ids }),
  setBaseDomains: (productId: string, ids: string[]) =>
    api.put(`${product(productId)}/base-domains`, { base_domain_ids: ids }),

  items: (kind: CatalogKind, query: Query) => api.list<CatalogItem>(`/catalog/${kind}`, query),
  createItem: (kind: CatalogKind, body: Dto<'CreateCatalogItemDto'>) => api.post(`/catalog/${kind}`, body),
  updateItem: (kind: CatalogKind, id: string, body: Dto<'UpdateCatalogItemDto'>) =>
    api.patch(`/catalog/${kind}/${seg(id)}`, body),
  transitionItem: (kind: CatalogKind, id: string, body: Transition) =>
    api.patch(`/catalog/${kind}/${seg(id)}/status`, body),

  features: (productId: string) => api.get<Dto<'FeatureListDto'>>(`${product(productId)}/features`),
  createFeature: (productId: string, body: Dto<'CreateFeatureDto'>) => api.post(`${product(productId)}/features`, body),
  updateFeature: (productId: string, featureId: string, body: Dto<'UpdateNameDescriptionDto'>) =>
    api.patch(`${product(productId)}/features/${seg(featureId)}`, body),
  transitionFeature: (productId: string, featureId: string, body: Transition) =>
    api.patch(`${product(productId)}/features/${seg(featureId)}/status`, body),

  capabilities: (productId: string) =>
    api.get<Dto<'ProductCapabilityListDto'>>(`${product(productId)}/capabilities`),
  linkCapability: (productId: string, body: Dto<'LinkCapabilityDto'>) =>
    api.post(`${product(productId)}/capabilities`, body),
  retireCapability: (productId: string, linkId: string, reason: string) =>
    api.patch(`${product(productId)}/capabilities/${seg(linkId)}/status`, { target_status: 'RETIRED', reason }),

  addOns: (productId: string) => api.get<Dto<'AddOnListDto'>>(`${product(productId)}/add-ons`),
  createAddOn: (productId: string, body: Dto<'CreateAddOnDto'>) => api.post(`${product(productId)}/add-ons`, body),
  updateAddOn: (productId: string, addOnId: string, body: Dto<'UpdateNameDescriptionDto'>) =>
    api.patch(`${product(productId)}/add-ons/${seg(addOnId)}`, body),
  setAddOnGrants: (productId: string, addOnId: string, body: Dto<'ReplaceGrantsDto'>) =>
    api.put(`${product(productId)}/add-ons/${seg(addOnId)}/grants`, body),
  transitionAddOn: (productId: string, addOnId: string, body: Transition) =>
    api.patch(`${product(productId)}/add-ons/${seg(addOnId)}/status`, body),
  setAddOnPrice: (productId: string, addOnId: string, body: Dto<'SetPriceDto'>) =>
    api.put(`${product(productId)}/add-ons/${seg(addOnId)}/prices`, body),
  deleteAddOnPrice: (productId: string, addOnId: string, priceId: string) =>
    api.delete(`${product(productId)}/add-ons/${seg(addOnId)}/prices/${seg(priceId)}`),

  prices: (productId: string) => api.get<Dto<'PriceListDto'>>(`${product(productId)}/prices`),
  setPrice: (productId: string, body: Dto<'SetPriceDto'>) => api.put(`${product(productId)}/prices`, body),
  deletePrice: (productId: string, priceId: string) => api.delete(`${product(productId)}/prices/${seg(priceId)}`),

  releases: (productId: string) => api.get<Dto<'ReleaseListDto'>>(`${product(productId)}/releases`),
  createRelease: (productId: string, body: Dto<'CreateReleaseDto'>) => api.post(`${product(productId)}/releases`, body),
  updateRelease: (productId: string, releaseId: string, body: Dto<'UpdateReleaseDto'>) =>
    api.patch(`${product(productId)}/releases/${seg(releaseId)}`, body),
  transitionRelease: (productId: string, releaseId: string, body: Dto<'ReleaseTransitionDto'>) =>
    api.patch(`${product(productId)}/releases/${seg(releaseId)}/status`, body),
};
