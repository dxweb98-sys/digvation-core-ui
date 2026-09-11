import { resolveProductDataSource } from '../../products/data/resolve-product-data-source';
import type { CommercialCatalogDataSource } from './commercial-catalog-data-source';
import type {
  AddOnOffering,
  CatalogPrice,
} from '../types/commercial-catalog';

const PRODUCT_PRICES: Record<string, CatalogPrice[]> = {
  'product-workshop': [
    {
      id: 'price-workshop-monthly-idr',
      billingCycle: 'MONTHLY',
      currency: 'IDR',
      amountMinor: 30000000,
      createdAt: '2026-09-11T00:00:00.000Z',
      updatedAt: '2026-09-11T00:00:00.000Z',
    },
  ],
};

const ADD_ONS: AddOnOffering[] = [];

const VALID_TRANSITIONS: Record<AddOnOffering['status'], AddOnOffering['status'][]> = {
  DRAFT: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['DRAFT', 'RETIRED'],
  RETIRED: ['DRAFT'],
};

function copy<T>(value: T): T {
  return structuredClone(value);
}

function now() {
  return new Date().toISOString();
}

export function createMockCommercialCatalogDataSource(): CommercialCatalogDataSource {
  const prices = copy(PRODUCT_PRICES);
  const addOns = copy(ADD_ONS);
  const productDataSource = resolveProductDataSource();

  return {
    async getProductPrices(productId) {
      return copy(prices[productId] ?? []);
    },

    async upsertProductPrice(productId, input) {
      if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
        throw new Error('Catalog price must be a non-negative minor-unit amount.');
      }
      const currency = input.currency.trim().toUpperCase();
      const items = prices[productId] ?? [];
      const existing = items.find(
        (item) =>
          item.billingCycle === input.billingCycle && item.currency === currency,
      );
      if (existing) {
        existing.amountMinor = input.amountMinor;
        existing.updatedAt = now();
        prices[productId] = items;
        return copy(existing);
      }
      const created: CatalogPrice = {
        id: `price-${productId}-${input.billingCycle.toLowerCase()}-${currency.toLowerCase()}`,
        billingCycle: input.billingCycle,
        currency,
        amountMinor: input.amountMinor,
        createdAt: now(),
        updatedAt: now(),
      };
      prices[productId] = [...items, created];
      return copy(created);
    },

    async getProductAddOns(productId) {
      return copy(addOns.filter((item) => item.productId === productId));
    },

    async getAddOn(addOnOfferingId) {
      const item = addOns.find((candidate) => candidate.id === addOnOfferingId);
      return item ? copy(item) : null;
    },

    async createAddOn(input) {
      const code = input.code.trim().toUpperCase();
      if (
        addOns.some(
          (item) => item.productId === input.productId && item.code === code,
        )
      ) {
        throw new Error('Add-on code is already in use for this product.');
      }
      const timestamp = now();
      const item: AddOnOffering = {
        id: `add-on-${input.productId}-${code.toLowerCase()}`,
        productId: input.productId,
        code,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        status: 'DRAFT',
        statusChangedAt: timestamp,
        prices: [],
        featureGrants: [],
        capabilityGrants: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      addOns.push(item);
      return copy(item);
    },

    async updateAddOn(input) {
      const item = addOns.find(
        (candidate) => candidate.id === input.addOnOfferingId,
      );
      if (!item) throw new Error('Add-on offering was not found.');
      item.name = input.name.trim();
      item.description = input.description?.trim() || undefined;
      item.updatedAt = now();
      return copy(item);
    },

    async upsertAddOnPrice(addOnOfferingId, input) {
      const item = addOns.find((candidate) => candidate.id === addOnOfferingId);
      if (!item) throw new Error('Add-on offering was not found.');
      if (item.status === 'RETIRED') {
        throw new Error('Retired add-on pricing cannot be changed.');
      }
      const currency = input.currency.trim().toUpperCase();
      const existing = item.prices.find(
        (price) =>
          price.billingCycle === input.billingCycle && price.currency === currency,
      );
      if (existing) {
        existing.amountMinor = input.amountMinor;
        existing.updatedAt = now();
        item.updatedAt = now();
        return copy(existing);
      }
      const price: CatalogPrice = {
        id: `price-${item.id}-${input.billingCycle.toLowerCase()}-${currency.toLowerCase()}`,
        billingCycle: input.billingCycle,
        currency,
        amountMinor: input.amountMinor,
        createdAt: now(),
        updatedAt: now(),
      };
      item.prices.push(price);
      item.updatedAt = now();
      return copy(price);
    },

    async replaceAddOnGrants(input) {
      const item = addOns.find(
        (candidate) => candidate.id === input.addOnOfferingId,
      );
      if (!item) throw new Error('Add-on offering was not found.');
      if (item.status !== 'DRAFT') {
        throw new Error('Add-on grants can only be changed while draft.');
      }
      const detail = await productDataSource.getProductDetail(item.productId);
      if (!detail) throw new Error('Product catalog was not found.');
      const features = detail.features.filter((feature) =>
        input.featureIds.includes(feature.id),
      );
      const capabilities = detail.capabilities.filter((capability) =>
        input.capabilityIds.includes(capability.id),
      );
      if (features.length !== input.featureIds.length) {
        throw new Error('A selected feature does not belong to this product.');
      }
      if (capabilities.length !== input.capabilityIds.length) {
        throw new Error(
          'A selected capability is not compatible with this product.',
        );
      }
      item.featureGrants = features.map((feature) => ({
        productFeatureId: feature.id,
        code: feature.code,
        name: feature.name,
        status: feature.status,
      }));
      item.capabilityGrants = capabilities.map((capability) => ({
        capabilityId: capability.id,
        code: capability.code,
        name: capability.name,
        status: capability.status,
      }));
      item.updatedAt = now();
    },

    async transitionAddOn(input) {
      const item = addOns.find(
        (candidate) => candidate.id === input.addOnOfferingId,
      );
      if (!item) throw new Error('Add-on offering was not found.');
      if (!input.reason.trim()) throw new Error('A lifecycle reason is required.');
      if (!VALID_TRANSITIONS[item.status].includes(input.targetStatus)) {
        throw new Error(
          `Cannot transition ${item.status} to ${input.targetStatus}.`,
        );
      }
      if (input.targetStatus === 'ACTIVE') {
        if (!item.prices.length) {
          throw new Error('Add at least one catalog price before activation.');
        }
        if (!item.featureGrants.length && !item.capabilityGrants.length) {
          throw new Error('Add at least one entitlement grant before activation.');
        }
        if (
          item.featureGrants.some((grant) => grant.status !== 'ACTIVE') ||
          item.capabilityGrants.some((grant) => grant.status !== 'ACTIVE')
        ) {
          throw new Error('Every entitlement grant must be active before activation.');
        }
      }
      item.status = input.targetStatus;
      item.statusChangedAt = now();
      item.updatedAt = item.statusChangedAt;
      return copy(item);
    },
  };
}
