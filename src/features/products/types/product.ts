import type { CapabilitySummary } from '../../capabilities/types/capability';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';
export type ProductFeatureStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFeature {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: ProductFeatureStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListQuery {
  search: string;
  status: ProductStatus | 'ALL';
  page: number;
  limit: number;
}

export interface ProductListResult {
  products: ProductListItem[];
  total: number;
  totalPages: number;
}

export interface ProductListItem extends Product {
  featureCount: number;
  clientCount: number;
}

export interface ProductDetail {
  product: Product;
  features: ProductFeature[];
  capabilities: CapabilitySummary[];
}

export interface CreateProductInput {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateProductInput {
  name: string;
  description?: string;
}

export interface ProductStatusTransitionInput {
  productId: string;
  targetStatus: ProductStatus;
  reason: string;
}

export interface CreateProductFeatureInput {
  productId: string;
  code: string;
  name: string;
  description?: string;
}

export interface UpdateProductFeatureInput {
  productId: string;
  featureId: string;
  name: string;
  description?: string;
}

export interface ProductFeatureStatusTransitionInput {
  productId: string;
  featureId: string;
  targetStatus: ProductFeatureStatus;
  reason: string;
}

export interface ReplaceProductCapabilitiesInput {
  productId: string;
  capabilityIds: string[];
}
