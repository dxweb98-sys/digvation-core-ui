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
    description: 'Selling, checkout, payment, receipt, refund, and cashier operations.',
    status: 'ACTIVE',
    createdAt: '2026-06-10T04:30:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'product-workshop',
    code: 'WORKSHOP',
    name: 'Digvation Workshop',
    description: 'Vehicle service execution, inspection, estimates, work orders, invoicing, and service history.',
    status: 'ACTIVE',
    createdAt: '2026-08-18T07:10:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'product-inventory',
    code: 'INVENTORY',
    name: 'Digvation Inventory',
    description: 'Stock authority for receiving, transfer, adjustment, reservation, and purchasing workflows.',
    status: 'DRAFT',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
];

const FEATURES: Record<string, ProductFeature[]> = {
  'product-pos': [
    { id: 'feature-pos-sales', code: 'pos.sales', name: 'Sales', description: 'Sale capture and transaction management.', status: 'ACTIVE', createdAt: '2026-06-10T04:30:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-pos-checkout', code: 'pos.checkout', name: 'Checkout', description: 'Checkout orchestration and completion.', status: 'ACTIVE', createdAt: '2026-06-10T04:30:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-pos-payments', code: 'pos.payments', name: 'Payments', description: 'Payment execution and recording.', status: 'ACTIVE', createdAt: '2026-06-10T04:30:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-pos-receipts', code: 'pos.receipts', name: 'Receipts', description: 'Receipt generation and transaction proof.', status: 'ACTIVE', createdAt: '2026-06-10T04:30:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-pos-refunds', code: 'pos.refunds', name: 'Refunds', description: 'Refund and void transaction handling.', status: 'ACTIVE', createdAt: '2026-06-10T04:30:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-pos-cashier-session', code: 'pos.cashier-session', name: 'Cashier Session', description: 'Cashier/register session lifecycle and accountability.', status: 'ACTIVE', createdAt: '2026-06-10T04:30:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
  ],
  'product-workshop': [
    { id: 'feature-workshop-inspections', code: 'workshop.inspections', name: 'Inspections', description: 'Vehicle inspection and service intake findings.', status: 'ACTIVE', createdAt: '2026-08-18T07:10:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-workshop-estimates', code: 'workshop.estimates', name: 'Estimates', description: 'Service estimates before work execution.', status: 'ACTIVE', createdAt: '2026-08-18T07:10:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-workshop-work-orders', code: 'workshop.work-orders', name: 'Work Orders', description: 'Workshop job planning, execution, and fulfillment tracking.', status: 'ACTIVE', createdAt: '2026-08-18T07:10:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-workshop-invoicing', code: 'workshop.invoicing', name: 'Invoicing', description: 'Customer billing for completed workshop work.', status: 'ACTIVE', createdAt: '2026-08-18T07:10:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-workshop-service-history', code: 'workshop.service-history', name: 'Service History', description: 'Historical vehicle service and completed-work records.', status: 'ACTIVE', createdAt: '2026-08-18T07:10:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
  ],
  'product-inventory': [
    { id: 'feature-inventory-stock', code: 'inventory.stock', name: 'Stock', description: 'Canonical stock and availability authority.', status: 'DRAFT', createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-inventory-receiving', code: 'inventory.receiving', name: 'Receiving', description: 'Inbound stock receiving and confirmation.', status: 'DRAFT', createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-inventory-transfers', code: 'inventory.transfers', name: 'Transfers', description: 'Stock movement between authorized locations.', status: 'DRAFT', createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-inventory-adjustments', code: 'inventory.adjustments', name: 'Adjustments', description: 'Controlled stock adjustment and reason tracking.', status: 'DRAFT', createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
    { id: 'feature-inventory-purchasing', code: 'inventory.purchasing', name: 'Purchasing', description: 'Purchasing and replenishment workflows where assigned to Inventory.', status: 'DRAFT', createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z' },
  ],
};

const CAPABILITIES: Capability[] = [
  { id: 'capability-catalog', code: 'CATALOG', name: 'Catalog', description: 'Reusable business catalog foundation consumed by compatible products.', status: 'ACTIVE' },
  { id: 'capability-customer-management', code: 'CUSTOMER_MANAGEMENT', name: 'Customer Management', description: 'Shared customer identity and customer-management capability.', status: 'ACTIVE' },
  { id: 'capability-membership', code: 'MEMBERSHIP', name: 'Membership', description: 'Membership enrollment, status, and member-specific business behavior.', status: 'ACTIVE' },
  { id: 'capability-loyalty-points', code: 'LOYALTY_POINTS', name: 'Loyalty Points', description: 'Optional points earning and redemption capability for eligible products.', status: 'DRAFT' },
  { id: 'capability-promotions', code: 'PROMOTIONS', name: 'Promotions', description: 'Customer-facing promotion, offer, discount, and campaign rules.', status: 'ACTIVE' },
  { id: 'capability-tax-fiscal', code: 'TAX_FISCAL', name: 'Tax / Fiscal', description: 'Dynamic business tax and fiscal configuration/calculation capability.', status: 'ACTIVE' },
  { id: 'capability-finance-operations', code: 'FINANCE_OPERATIONS', name: 'Finance Operations', description: 'Reusable finance/accounting-adjacent operational capability where explicitly entitled.', status: 'DRAFT' },
];

const PRODUCT_CAPABILITIES: Record<string, string[]> = {
  'product-pos': CAPABILITIES.map((capability) => capability.id),
  'product-workshop': CAPABILITIES.map((capability) => capability.id),
  'product-inventory': ['capability-catalog', 'capability-tax-fiscal', 'capability-finance-operations'],
};

const CLIENT_COUNTS: Record<string, number> = {
  'product-pos': 1,
  'product-workshop': 1,
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
    capabilities: CAPABILITIES.filter((capability) => capabilityIds.has(capability.id)).map(copyCapability),
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
        const hasStatus = query.status === 'ALL' || product.status === query.status;
        return hasStatus && [product.name, product.code, product.description].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
      });
      const totalPages = Math.max(1, Math.ceil(matches.length / query.limit));
      const page = Math.min(Math.max(query.page, 1), totalPages);
      const start = (page - 1) * query.limit;
      return { products: matches.slice(start, start + query.limit).map((product) => ({ ...copyProduct(product), featureCount: features[product.id]?.length ?? 0, clientCount: clientCounts[product.id] ?? 0 })), total: matches.length, totalPages };
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
      if (products.some((product) => product.code === code)) throw new Error('Product code is already in use.');
      const now = getNow();
      const product: Product = { id: `product-${code.toLowerCase()}-${products.length + 1}`, code, name: input.name.trim(), description: input.description?.trim() || undefined, status: 'DRAFT', createdAt: now, updatedAt: now };
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
      const product = products.find((candidate) => candidate.id === input.productId);
      if (!product) throw new Error('Product was not found.');
      if (!input.reason.trim()) throw new Error('A reason is required for lifecycle changes.');
      if (!VALID_TRANSITIONS[product.status].includes(input.targetStatus)) throw new Error(`Cannot transition ${product.status} to ${input.targetStatus}.`);
      product.status = input.targetStatus;
      product.updatedAt = getNow();
      return getDetail(product, features, productCapabilities);
    },

    async replaceProductCapabilities(input) {
      const product = products.find((candidate) => candidate.id === input.productId);
      if (!product) throw new Error('Product was not found.');
      if (product.status === 'RETIRED') throw new Error('Capability compatibility cannot be changed for a retired product.');
      const capabilityIds = new Set(input.capabilityIds);
      if (capabilityIds.size !== input.capabilityIds.length) throw new Error('Capability compatibility contains duplicate entries.');
      for (const capabilityId of capabilityIds) {
        const capability = CAPABILITIES.find((candidate) => candidate.id === capabilityId);
        if (!capability) throw new Error('One or more capabilities were not found.');
        if (capability.status === 'RETIRED') throw new Error('Retired capabilities cannot be assigned to a product catalog.');
      }
      productCapabilities[product.id] = CAPABILITIES.filter((capability) => capabilityIds.has(capability.id)).map((capability) => capability.id);
      product.updatedAt = getNow();
    },
  };
}
