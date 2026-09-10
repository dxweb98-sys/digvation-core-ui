import type { ProductDataSource } from './product-data-source';
import { normalizeProductCode } from '../schemas/product-form-schema';
import { getMockCapabilityStore } from '../../capabilities/data/mock-capability-store';
import type {
  Product,
  ProductDetail,
  ProductFeature,
  ProductFeatureStatus,
  ProductStatus,
} from '../types/product';

const PRODUCTS: Product[] = [
  {
    id: 'product-pos',
    code: 'POS',
    name: 'Digvation POS',
    description:
      'Digvation point-of-sale product for sales, checkout, payment, receipt, refund/void, and cashier/register operations.',
    status: 'ACTIVE',
    createdAt: '2026-06-10T04:30:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'product-workshop',
    code: 'WORKSHOP',
    name: 'Digvation Workshop',
    description:
      'Digvation workshop/service-execution product. Detailed feature catalog remains intentionally unseeded until its product scope is explicitly locked.',
    status: 'DRAFT',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'product-inventory',
    code: 'INVENTORY',
    name: 'Digvation Inventory',
    description:
      'Digvation inventory/stock product. Detailed feature and capability compatibility remain intentionally unseeded until its product scope is explicitly locked.',
    status: 'DRAFT',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
];

const FEATURES: Record<string, ProductFeature[]> = {
  'product-pos': [
    {
      id: 'feature-pos-sales',
      code: 'pos.sales',
      name: 'Sales & Transactions',
      description:
        'Sale and sale-line lifecycle, including authoritative POS transaction execution.',
      status: 'ACTIVE',
      createdAt: '2026-06-10T04:30:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    },
    {
      id: 'feature-pos-checkout',
      code: 'pos.checkout',
      name: 'Checkout',
      description: 'Cart-to-checkout execution inside the POS domain.',
      status: 'ACTIVE',
      createdAt: '2026-06-10T04:30:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    },
    {
      id: 'feature-pos-payments',
      code: 'pos.payments',
      name: 'Payment Execution',
      description:
        'Tender and payment execution inside the accepted POS payment boundary.',
      status: 'ACTIVE',
      createdAt: '2026-06-10T04:30:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    },
    {
      id: 'feature-pos-receipts',
      code: 'pos.receipts',
      name: 'Receipts',
      description: 'Receipt generation and receipt records owned by POS.',
      status: 'ACTIVE',
      createdAt: '2026-06-10T04:30:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    },
    {
      id: 'feature-pos-refunds-voids',
      code: 'pos.refunds-voids',
      name: 'Refunds & Voids',
      description: 'POS refund and void transaction behavior.',
      status: 'ACTIVE',
      createdAt: '2026-06-10T04:30:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    },
    {
      id: 'feature-pos-cashier-sessions',
      code: 'pos.cashier-sessions',
      name: 'Cashier & Register Sessions',
      description: 'Cashier, register, and session operations owned by POS.',
      status: 'ACTIVE',
      createdAt: '2026-06-10T04:30:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    },
  ],
  'product-workshop': [],
  'product-inventory': [],
};

const PRODUCT_CAPABILITIES: Record<string, string[]> = {
  'product-pos': [
    'capability-customer-management',
    'capability-membership',
    'capability-promotions',
    'capability-tax-fiscal',
    'capability-loyalty-points',
  ],
  'product-workshop': [
    'capability-customer-management',
    'capability-membership',
    'capability-promotions',
    'capability-tax-fiscal',
    'capability-loyalty-points',
  ],
  'product-inventory': [],
};

const CLIENT_COUNTS: Record<string, number> = {
  'product-pos': 1,
  'product-workshop': 0,
  'product-inventory': 0,
};

const PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['RETIRED'],
  RETIRED: ['DRAFT'],
};

const FEATURE_TRANSITIONS: Record<ProductFeatureStatus, ProductFeatureStatus[]> = {
  DRAFT: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['RETIRED'],
  RETIRED: ['DRAFT'],
};

function getNow() {
  return new Date().toISOString();
}

function copyProduct(product: Product): Product {
  return { ...product };
}

function getDetail(
  product: Product,
  features: Record<string, ProductFeature[]>,
  productCapabilities: Record<string, string[]>,
): ProductDetail {
  const capabilityIds = new Set(productCapabilities[product.id] ?? []);
  return {
    product: copyProduct(product),
    features: structuredClone(features[product.id] ?? []),
    capabilities: getMockCapabilityStore()
      .filter((capability) => capabilityIds.has(capability.id))
      .map((capability) => ({ ...capability })),
  };
}

function findProduct(products: Product[], productId: string) {
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) throw new Error('Product was not found.');
  return product;
}

function findFeature(
  features: Record<string, ProductFeature[]>,
  productId: string,
  featureId: string,
) {
  const feature = (features[productId] ?? []).find(
    (candidate) => candidate.id === featureId,
  );
  if (!feature) throw new Error('Product feature was not found.');
  return feature;
}

export function createMockProductDataSource(): ProductDataSource {
  const products = PRODUCTS.map(copyProduct);
  const features = structuredClone(FEATURES);
  const productCapabilities = structuredClone(PRODUCT_CAPABILITIES);
  const clientCounts = { ...CLIENT_COUNTS };

  return {
    async getProducts(query) {
      const normalizedSearch = query.search.trim().toLowerCase();
      const matches = products.filter((product) => {
        const hasStatus =
          query.status === 'ALL' || product.status === query.status;
        return (
          hasStatus &&
          [product.name, product.code, product.description]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch)
        );
      });
      const totalPages = Math.max(1, Math.ceil(matches.length / query.limit));
      const page = Math.min(Math.max(query.page, 1), totalPages);
      const start = (page - 1) * query.limit;
      return {
        products: matches.slice(start, start + query.limit).map((product) => ({
          ...copyProduct(product),
          featureCount: features[product.id]?.length ?? 0,
          clientCount: clientCounts[product.id] ?? 0,
        })),
        total: matches.length,
        totalPages,
      };
    },

    async getProductDetail(productId) {
      const product = products.find((candidate) => candidate.id === productId);
      return product ? getDetail(product, features, productCapabilities) : null;
    },

    async createProduct(input) {
      const code = normalizeProductCode(input.code);
      if (products.some((product) => product.code === code)) {
        throw new Error('Product code is already in use.');
      }
      const timestamp = getNow();
      const product: Product = {
        id: `product-${code.toLowerCase()}-${products.length + 1}`,
        code,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        status: 'DRAFT',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      products.unshift(product);
      features[product.id] = [];
      productCapabilities[product.id] = [];
      clientCounts[product.id] = 0;
      return getDetail(product, features, productCapabilities);
    },

    async updateProduct(productId, input) {
      const product = findProduct(products, productId);
      product.name = input.name.trim();
      product.description = input.description?.trim() || undefined;
      product.updatedAt = getNow();
      return getDetail(product, features, productCapabilities);
    },

    async transitionProductStatus(input) {
      const product = findProduct(products, input.productId);
      if (!input.reason.trim()) {
        throw new Error('A reason is required for lifecycle changes.');
      }
      if (!PRODUCT_TRANSITIONS[product.status].includes(input.targetStatus)) {
        throw new Error(
          `Cannot transition ${product.status} to ${input.targetStatus}.`,
        );
      }
      if (
        input.targetStatus === 'RETIRED' &&
        (features[product.id] ?? []).some((feature) => feature.status !== 'RETIRED')
      ) {
        throw new Error('Product features must be retired before retiring the product.');
      }
      product.status = input.targetStatus;
      product.updatedAt = getNow();
      return getDetail(product, features, productCapabilities);
    },

    async createProductFeature(input) {
      const product = findProduct(products, input.productId);
      if (product.status === 'RETIRED') {
        throw new Error('Cannot add a feature to a retired product.');
      }
      const code = input.code.trim().toLowerCase();
      const productFeatures = features[product.id] ?? [];
      if (productFeatures.some((feature) => feature.code === code)) {
        throw new Error('Product feature code is already in use for this product.');
      }
      const timestamp = getNow();
      productFeatures.push({
        id: `feature-${product.id}-${productFeatures.length + 1}`,
        code,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        status: 'DRAFT',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      features[product.id] = productFeatures;
      product.updatedAt = timestamp;
    },

    async updateProductFeature(input) {
      const feature = findFeature(features, input.productId, input.featureId);
      feature.name = input.name.trim();
      feature.description = input.description?.trim() || undefined;
      feature.updatedAt = getNow();
    },

    async transitionProductFeatureStatus(input) {
      const product = findProduct(products, input.productId);
      const feature = findFeature(features, input.productId, input.featureId);
      if (!input.reason.trim()) {
        throw new Error('A reason is required for lifecycle changes.');
      }
      if (!FEATURE_TRANSITIONS[feature.status].includes(input.targetStatus)) {
        throw new Error(
          `Cannot transition ${feature.status} to ${input.targetStatus}.`,
        );
      }
      if (input.targetStatus === 'ACTIVE' && product.status !== 'ACTIVE') {
        throw new Error('Product must be active before activating a feature.');
      }
      feature.status = input.targetStatus;
      feature.updatedAt = getNow();
    },

    async replaceProductCapabilities(input) {
      const product = findProduct(products, input.productId);
      if (product.status === 'RETIRED') {
        throw new Error(
          'Capability compatibility cannot be changed for a retired product.',
        );
      }
      const capabilityIds = new Set(input.capabilityIds);
      if (capabilityIds.size !== input.capabilityIds.length) {
        throw new Error('Capability compatibility contains duplicate entries.');
      }
      const capabilities = getMockCapabilityStore();
      for (const capabilityId of capabilityIds) {
        const capability = capabilities.find(
          (candidate) => candidate.id === capabilityId,
        );
        if (!capability) {
          throw new Error('One or more capabilities were not found.');
        }
        if (capability.status === 'RETIRED') {
          throw new Error(
            'Retired capabilities cannot be assigned to a product catalog.',
          );
        }
      }
      productCapabilities[product.id] = capabilities
        .filter((capability) => capabilityIds.has(capability.id))
        .map((capability) => capability.id);
      product.updatedAt = getNow();
    },
  };
}
