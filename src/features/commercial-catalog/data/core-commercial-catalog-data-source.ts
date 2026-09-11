import { CoreApiError, coreApiRequest } from '../../../shared/http/core-api-client';
import type { CommercialCatalogDataSource } from './commercial-catalog-data-source';
import type {
  AddOnOffering,
  CatalogPrice,
} from '../types/commercial-catalog';

interface CoreCatalogPrice {
  id: string;
  billing_cycle: CatalogPrice['billingCycle'];
  currency: string;
  amount_minor: number;
  created_at: string;
  updated_at: string;
}

interface CoreAddOnSummary {
  id: string;
  product_id: string;
  code: string;
  name: string;
  description: string | null;
  status: AddOnOffering['status'];
  status_changed_at: string;
  created_at: string;
  updated_at: string;
}

interface CoreAddOnDetail extends CoreAddOnSummary {
  prices: CoreCatalogPrice[];
  feature_grants: Array<{
    product_feature_id: string;
    code: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  }>;
  capability_grants: Array<{
    capability_id: string;
    code: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  }>;
}

interface MutationResponse {
  resource_id: string;
}

function mapPrice(item: CoreCatalogPrice): CatalogPrice {
  return {
    id: item.id,
    billingCycle: item.billing_cycle,
    currency: item.currency,
    amountMinor: item.amount_minor,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapAddOn(item: CoreAddOnDetail): AddOnOffering {
  return {
    id: item.id,
    productId: item.product_id,
    code: item.code,
    name: item.name,
    description: item.description ?? undefined,
    status: item.status,
    statusChangedAt: item.status_changed_at,
    prices: item.prices.map(mapPrice),
    featureGrants: item.feature_grants.map((grant) => ({
      productFeatureId: grant.product_feature_id,
      code: grant.code,
      name: grant.name,
      status: grant.status,
    })),
    capabilityGrants: item.capability_grants.map((grant) => ({
      capabilityId: grant.capability_id,
      code: grant.code,
      name: grant.name,
      status: grant.status,
    })),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

async function getAddOnOrThrow(addOnOfferingId: string) {
  const addOn = await coreCommercialCatalogDataSource.getAddOn(addOnOfferingId);
  if (!addOn) throw new Error('Add-on offering was not found after the operation.');
  return addOn;
}

export const coreCommercialCatalogDataSource: CommercialCatalogDataSource = {
  async getProductPrices(productId) {
    const response = await coreApiRequest<{ items: CoreCatalogPrice[] }>(
      `/products/${productId}/prices`,
    );
    return response.items.map(mapPrice);
  },

  async upsertProductPrice(productId, input) {
    await coreApiRequest<MutationResponse>(`/products/${productId}/prices`, {
      method: 'PUT',
      body: {
        billing_cycle: input.billingCycle,
        currency: input.currency,
        amount_minor: input.amountMinor,
      },
    });
    const prices = await this.getProductPrices(productId);
    const price = prices.find(
      (item) =>
        item.billingCycle === input.billingCycle && item.currency === input.currency,
    );
    if (!price) throw new Error('Catalog price was not found after the operation.');
    return price;
  },

  async getProductAddOns(productId) {
    const response = await coreApiRequest<{ items: CoreAddOnSummary[] }>(
      `/products/${productId}/add-ons`,
    );
    return Promise.all(response.items.map((item) => getAddOnOrThrow(item.id)));
  },

  async getAddOn(addOnOfferingId) {
    try {
      return mapAddOn(
        await coreApiRequest<CoreAddOnDetail>(`/add-ons/${addOnOfferingId}`),
      );
    } catch (error) {
      if (error instanceof CoreApiError && error.status === 404) return null;
      throw error;
    }
  },

  async createAddOn(input) {
    const result = await coreApiRequest<MutationResponse>(
      `/products/${input.productId}/add-ons`,
      {
        method: 'POST',
        body: {
          code: input.code,
          name: input.name,
          description: input.description?.trim() || undefined,
        },
      },
    );
    return getAddOnOrThrow(result.resource_id);
  },

  async updateAddOn(input) {
    await coreApiRequest<MutationResponse>(`/add-ons/${input.addOnOfferingId}`, {
      method: 'PATCH',
      body: {
        name: input.name,
        description: input.description?.trim() || null,
      },
    });
    return getAddOnOrThrow(input.addOnOfferingId);
  },

  async upsertAddOnPrice(addOnOfferingId, input) {
    await coreApiRequest<MutationResponse>(`/add-ons/${addOnOfferingId}/prices`, {
      method: 'PUT',
      body: {
        billing_cycle: input.billingCycle,
        currency: input.currency,
        amount_minor: input.amountMinor,
      },
    });
    const addOn = await getAddOnOrThrow(addOnOfferingId);
    const price = addOn.prices.find(
      (item) =>
        item.billingCycle === input.billingCycle && item.currency === input.currency,
    );
    if (!price) throw new Error('Add-on price was not found after the operation.');
    return price;
  },

  async replaceAddOnGrants(input) {
    await coreApiRequest(`/add-ons/${input.addOnOfferingId}/grants`, {
      method: 'PUT',
      body: {
        feature_ids: input.featureIds,
        capability_ids: input.capabilityIds,
      },
    });
  },

  async transitionAddOn(input) {
    await coreApiRequest(`/add-ons/${input.addOnOfferingId}/status`, {
      method: 'PATCH',
      body: {
        target_status: input.targetStatus,
        reason: input.reason,
      },
    });
    return getAddOnOrThrow(input.addOnOfferingId);
  },
};
