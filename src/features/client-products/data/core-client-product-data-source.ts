import { coreApiRequest } from '../../../shared/http/core-api-client';
import type { ClientProductDataSource } from './client-product-data-source';
import type {
  AssignableProduct,
  ClientProduct,
  ClientProductSummary,
  ProductClientSummary,
} from '../types/client-product';

interface CoreClientProduct {
  id: string;
  status: ClientProduct['status'];
  status_changed_at: string;
  client: {
    id: string;
    code: string;
    display_name: string;
    status: string;
  };
  product: {
    id: string;
    code: string;
    name: string;
    status: string;
  };
  created_at: string;
  updated_at: string;
}

interface CoreClientProductList {
  items: CoreClientProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface CoreProductList {
  items: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ClientProductMutationResponse {
  client_product_id: string;
}

interface ClientProductFeatureList {
  items: Array<{ product_feature_id: string }>;
}

function mapRelationship(item: CoreClientProduct): ClientProduct {
  return {
    id: item.id,
    clientId: item.client.id,
    productId: item.product.id,
    status: item.status,
    statusChangedAt: item.status_changed_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapClientSummary(item: CoreClientProduct): ClientProductSummary {
  return {
    ...mapRelationship(item),
    productName: item.product.name,
    productCode: item.product.code,
  };
}

function mapProductSummary(item: CoreClientProduct): ProductClientSummary {
  return {
    ...mapRelationship(item),
    clientDisplayName: item.client.display_name,
    clientCode: item.client.code,
  };
}

async function listRelationships(params: {
  clientId?: string;
  productId?: string;
}) {
  const search = new URLSearchParams({ page: '1', limit: '100' });
  if (params.clientId) search.set('client_id', params.clientId);
  if (params.productId) search.set('product_id', params.productId);
  const first = await coreApiRequest<CoreClientProductList>(
    `/client-products?${search.toString()}`,
  );
  if (first.pagination.total_pages <= 1) return first.items;

  const pages = await Promise.all(
    Array.from({ length: first.pagination.total_pages - 1 }, (_, index) => {
      const pageSearch = new URLSearchParams(search);
      pageSearch.set('page', String(index + 2));
      return coreApiRequest<CoreClientProductList>(
        `/client-products?${pageSearch.toString()}`,
      );
    }),
  );
  return [first, ...pages].flatMap((page) => page.items);
}

async function getRelationship(clientProductId: string) {
  return coreApiRequest<CoreClientProduct>(
    `/client-products/${clientProductId}`,
  );
}

export const coreClientProductDataSource: ClientProductDataSource = {
  async getClientProducts(clientId) {
    return (await listRelationships({ clientId })).map(mapClientSummary);
  },

  async getProductClients(productId) {
    return (await listRelationships({ productId })).map(mapProductSummary);
  },

  async getAssignableProducts(clientId) {
    const assignedIds = new Set(
      (await listRelationships({ clientId })).map((item) => item.product.id),
    );
    const first = await coreApiRequest<CoreProductList>(
      '/products?status=ACTIVE&page=1&limit=100',
    );
    const products = [...first.items];
    if (first.pagination.total_pages > 1) {
      const pages = await Promise.all(
        Array.from({ length: first.pagination.total_pages - 1 }, (_, index) =>
          coreApiRequest<CoreProductList>(
            `/products?status=ACTIVE&page=${index + 2}&limit=100`,
          ),
        ),
      );
      products.push(...pages.flatMap((page) => page.items));
    }
    return products
      .filter((product) => !assignedIds.has(product.id))
      .map<AssignableProduct>((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
      }));
  },

  async getClientProductFeatureIds(clientProductId) {
    const response = await coreApiRequest<ClientProductFeatureList>(
      `/client-products/${clientProductId}/features`,
    );
    return response.items.map((item) => item.product_feature_id);
  },

  async assignProduct(input) {
    const response = await coreApiRequest<ClientProductMutationResponse>(
      '/client-products',
      {
        method: 'POST',
        body: { client_id: input.clientId, product_id: input.productId },
      },
    );
    return mapRelationship(await getRelationship(response.client_product_id));
  },

  async replaceClientProductFeatures(input) {
    await coreApiRequest(`/client-products/${input.clientProductId}/features`, {
      method: 'PUT',
      body: { feature_ids: input.featureIds },
    });
  },

  async transitionClientProductStatus(input) {
    await coreApiRequest(`/client-products/${input.clientProductId}/status`, {
      method: 'PATCH',
      body: {
        target_status: input.targetStatus,
        reason: input.reason,
      },
    });
    return mapRelationship(await getRelationship(input.clientProductId));
  },
};
