import {
  CoreApiError,
  coreApiRequest,
} from '../../../shared/http/core-api-client';
import type { ProductDataSource } from './product-data-source';
import type {
  Product,
  ProductDetail,
  ProductFeature,
  ProductListItem,
} from '../types/product';
import type { CapabilitySummary } from '../../capabilities/types/capability';

interface CorePagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface CoreProduct {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: Product['status'];
  status_changed_at: string;
  feature_count: number;
  client_count: number;
  created_at: string;
  updated_at: string;
}

interface CoreProductFeature {
  id: string;
  product_id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProductFeature['status'];
  status_changed_at: string;
  created_at: string;
  updated_at: string;
}

interface CoreProductCapability {
  capability_id: string;
  code: string;
  name: string;
  description: string | null;
  status: CapabilitySummary['status'];
}

interface CoreProductDetail extends CoreProduct {
  features: CoreProductFeature[];
  capabilities: CoreProductCapability[];
}

interface CoreProductListResponse {
  items: CoreProduct[];
  pagination: CorePagination;
}

interface ProductMutationResponse {
  product_id: string;
}

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function mapProduct(item: CoreProduct): Product {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? undefined,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapListItem(item: CoreProduct): ProductListItem {
  return {
    ...mapProduct(item),
    featureCount: item.feature_count,
    clientCount: item.client_count,
  };
}

function mapFeature(item: CoreProductFeature): ProductFeature {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? undefined,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapCapability(item: CoreProductCapability): CapabilitySummary {
  return {
    id: item.capability_id,
    code: item.code,
    name: item.name,
    description: item.description ?? undefined,
    status: item.status,
  };
}

function mapDetail(item: CoreProductDetail): ProductDetail {
  return {
    product: mapProduct(item),
    features: item.features.map(mapFeature),
    capabilities: item.capabilities.map(mapCapability),
  };
}

async function detailOrThrow(productId: string) {
  const detail = await coreProductDataSource.getProductDetail(productId);
  if (!detail) throw new Error('Product was not found after the operation.');
  return detail;
}

export const coreProductDataSource: ProductDataSource = {
  async getProducts(query) {
    const response = await coreApiRequest<CoreProductListResponse>(
      `/products${queryString({
        search: query.search.trim() || undefined,
        status: query.status === 'ALL' ? undefined : query.status,
        page: query.page,
        limit: query.limit,
      })}`,
    );
    return {
      products: response.items.map(mapListItem),
      total: response.pagination.total,
      totalPages: response.pagination.total_pages,
    };
  },

  async getProductDetail(productId) {
    try {
      return mapDetail(
        await coreApiRequest<CoreProductDetail>(`/products/${productId}`),
      );
    } catch (error) {
      if (error instanceof CoreApiError && error.status === 404) return null;
      throw error;
    }
  },

  async createProduct(input) {
    const result = await coreApiRequest<ProductMutationResponse>('/products', {
      method: 'POST',
      body: {
        code: input.code,
        name: input.name,
        description: input.description?.trim() || undefined,
      },
    });
    return detailOrThrow(result.product_id);
  },

  async updateProduct(productId, input) {
    await coreApiRequest<ProductMutationResponse>(`/products/${productId}`, {
      method: 'PATCH',
      body: {
        name: input.name,
        description: input.description?.trim() || null,
      },
    });
    return detailOrThrow(productId);
  },

  async transitionProductStatus(input) {
    await coreApiRequest(`/products/${input.productId}/status`, {
      method: 'PATCH',
      body: {
        target_status: input.targetStatus,
        reason: input.reason,
      },
    });
    return detailOrThrow(input.productId);
  },

  async createProductFeature(input) {
    await coreApiRequest(`/products/${input.productId}/features`, {
      method: 'POST',
      body: {
        code: input.code,
        name: input.name,
        description: input.description?.trim() || undefined,
      },
    });
  },

  async updateProductFeature(input) {
    await coreApiRequest(
      `/products/${input.productId}/features/${input.featureId}`,
      {
        method: 'PATCH',
        body: {
          name: input.name,
          description: input.description?.trim() || null,
        },
      },
    );
  },

  async transitionProductFeatureStatus(input) {
    await coreApiRequest(
      `/products/${input.productId}/features/${input.featureId}/status`,
      {
        method: 'PATCH',
        body: {
          target_status: input.targetStatus,
          reason: input.reason,
        },
      },
    );
  },

  async replaceProductCapabilities(input) {
    await coreApiRequest(`/products/${input.productId}/capabilities`, {
      method: 'PUT',
      body: { capability_ids: input.capabilityIds },
    });
  },
};
