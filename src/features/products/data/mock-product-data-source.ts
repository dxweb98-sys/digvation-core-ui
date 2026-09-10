import type { ProductDataSource } from './product-data-source';
import { normalizeProductCode } from '../schemas/product-form-schema';
import type {
  Capability,
  Product,
  ProductDetail,
  ProductFeature,
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

const CAPABILITIES: Capability[] = [
  {
    id: 'capability-customer-management',
    code: 'CUSTOMER_MANAGEMENT',
    name: 'Customer Management',
    description:
      'Reusable customer-management capability built on shared customer identity.',
    status: 'ACTIVE',
  },
  {
    id: 'capability-membership',
    code: 'MEMBERSHIP',
    name: 'Membership',
    description:
      'Reusable membership capability for enrollment, status, tier, benefits, and eligibility when enabled.',
    status: 'ACTIVE',
  },
  {
    id: 'capability-promotions',
    code: 'PROMOTIONS',
    name: 'Promotions',
    description:
      'Reusable customer-facing promotion, offer, discount, and commercial-rule capability.',
    status: 'ACTIVE',
  },
  {
    id: 'capability-tax-fiscal',
    code: 'TAX_FISCAL',
    name: 'Tax / Fiscal',
    description:
      'Reusable tax and fiscal-rule capability for compatible business products.',
    status: 'ACTIVE',
  },
  {
    id: 'capability-finance-operations',
    code: 'FINANCE_OPERATIONS',
    name: 'Finance Operations',
    description:
      'Reusable finance/financial-operations capability where explicitly entitled.',
    status: 'ACTIVE',
  },
  {
    id: 'capability-loyalty-points',
    code: 'LOYALTY_POINTS',
    name: 'Loyalty Points',
    description:
      'Optional loyalty-points capability kept separate from Membership; activation requires an explicit lifecycle decision.',
    status: 'DRAFT',
  },
];

const SHARED_BUSINESS_CAPABILITY_IDS = CAPABILITIES.map(
  (capability) => capability.id,
);

const PRODUCT_CAPABILITIES: Record<string, string[]> = {
  'product-pos': [...SHARED_BUSINESS_CAPABILITY_IDS],
  'product-workshop': [...SHARED_BUSINESS_CAPABILITY_IDS],
  'product-inventory': [],
};

const CLIENT_COUNTS: Record<string, number> = {
  'product-pos': 1,
  'product-workshop': 0,
  'product-inventory': 0,
};

const VALID_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
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

function copyCapability(capability: Capability): Capability {
  return { ...capability };
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
    capabilities: CAPABILITIES.filter((capability) =>
      capabilityIds.has(capability.id),
    ).map(copyCapability),
  };
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
        products: matches
          .slice(start, start + query.limit)
          .map((product) => ({
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

    async getCapabilities() {
      return CAPABILITIES.map(copyCapability);
    },

    async createProduct(input) {
      const code = normalizeProductCode(input.code);
      if (products.some((product) => product.code === code)) {
        throw new Error('Product code is already in use.');
      }
      const now = getNow();
      const product: Product = {
        id: `product-${code.toLowerCase()}-${products.length + 1}`,
        code,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
      };
      products.unshift(product);
      features[product.id] = [];
      productCapabilities[product.id] = [];
      clientCounts[product.id] = 0;
      return getDetail(product, features, productCapabilities);
    },

    async updateProduct(productId, input) {
      const product = products.find((candidate) => candidate.id === productId);
      if (!product) throw new Error('Product was not found.');
      product.name = input.name.trim();
      product.description = input.description?.trim() || undefined;
      product.updatedAt = getNow();
      return getDetail(product, features, productCapabilities);
    },

    async transitionProductStatus(input) {
      const product = products.find(
        (candidate) => candidate.id === input.productId,
      );
      if (!product) throw new Error('Product was not found.');
      if (!input.reason.trim()) {
        throw new Error('A reason is required for lifecycle changes.');
      }
      if (!VALID_TRANSITIONS[product.status].includes(input.targetStatus)) {
        throw new Error(
          `Cannot transition ${product.status} to ${input.targetStatus}.`,
        );
      }
      product.status = input.targetStatus;
      product.updatedAt = getNow();
      return getDetail(product, features, productCapabilities);
    },

    async replaceProductCapabilities(input) {
      const product = products.find(
        (candidate) => candidate.id === input.productId,
      );
      if (!product) throw new Error('Product was not found.');
      if (product.status === 'RETIRED') {
        throw new Error(
          'Capability compatibility cannot be changed for a retired product.',
        );
      }
      const capabilityIds = new Set(input.capabilityIds);
      if (capabilityIds.size !== input.capabilityIds.length) {
        throw new Error('Capability compatibility contains duplicate entries.');
      }
      for (const capabilityId of capabilityIds) {
        const capability = CAPABILITIES.find(
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
      productCapabilities[product.id] = CAPABILITIES.filter((capability) =>
        capabilityIds.has(capability.id),
      ).map((capability) => capability.id);
      product.updatedAt = getNow();
    },
  };
}
