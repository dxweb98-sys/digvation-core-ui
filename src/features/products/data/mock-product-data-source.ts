import type { ProductDataSource } from './product-data-source';
import { normalizeProductCode } from '../schemas/product-form-schema';
import type { Product, ProductDetail, ProductFeature, ProductStatus } from '../types/product';

const PRODUCTS: Product[] = [
  { id: 'product-pos', code: 'DIGVATION-POS', name: 'Digvation POS', description: 'Operational point-of-sale platform for service and retail businesses.', status: 'ACTIVE', createdAt: '2026-06-10T04:30:00.000Z', updatedAt: '2026-09-06T10:00:00.000Z' },
  { id: 'product-workshop', code: 'DIGVATION-WORKSHOP', name: 'Digvation Workshop', description: 'Workshop operations and invoicing foundation.', status: 'DRAFT', createdAt: '2026-08-18T07:10:00.000Z', updatedAt: '2026-09-04T08:40:00.000Z' },
  { id: 'product-company-site', code: 'COMPANY-SITE', name: 'Company Website', description: 'Managed company web presence product.', status: 'ACTIVE', createdAt: '2026-07-20T06:00:00.000Z', updatedAt: '2026-09-01T02:45:00.000Z' },
  { id: 'product-learning-media', code: 'LEARNING-MEDIA', name: 'Learning Media', status: 'RETIRED', createdAt: '2026-08-15T01:00:00.000Z', updatedAt: '2026-08-29T09:20:00.000Z' },
];

const FEATURES: Record<string, ProductFeature[]> = {
  'product-pos': [
    { id: 'feature-pos-cashier', code: 'CASHIER', name: 'Cashier', description: 'Transaction capture and payment recording.', status: 'ACTIVE', createdAt: '2026-06-10T04:30:00.000Z', updatedAt: '2026-09-06T10:00:00.000Z' },
    { id: 'feature-pos-catalog', code: 'CATALOG', name: 'Catalog', description: 'Product, price, and tax configuration.', status: 'ACTIVE', createdAt: '2026-06-10T04:30:00.000Z', updatedAt: '2026-09-05T10:00:00.000Z' },
    { id: 'feature-pos-employee', code: 'EMPLOYEE-CONTRIBUTION', name: 'Employee Contribution', description: 'Attributed service contribution reporting.', status: 'DRAFT', createdAt: '2026-08-28T04:30:00.000Z', updatedAt: '2026-09-04T10:00:00.000Z' },
  ],
  'product-workshop': [
    { id: 'feature-workshop-work-order', code: 'WORK-ORDER', name: 'Work Orders', description: 'Workshop job intake and fulfillment tracking.', status: 'DRAFT', createdAt: '2026-08-18T07:10:00.000Z', updatedAt: '2026-09-04T08:40:00.000Z' },
    { id: 'feature-workshop-invoice', code: 'INVOICING', name: 'Invoicing', description: 'Customer billing and receipt generation.', status: 'DRAFT', createdAt: '2026-08-18T07:10:00.000Z', updatedAt: '2026-09-04T08:40:00.000Z' },
  ],
  'product-company-site': [
    { id: 'feature-site-content', code: 'CONTENT-PAGES', name: 'Content Pages', description: 'Managed responsive company content pages.', status: 'ACTIVE', createdAt: '2026-07-20T06:00:00.000Z', updatedAt: '2026-09-01T02:45:00.000Z' },
  ],
  'product-learning-media': [
    { id: 'feature-learning-library', code: 'CONTENT-LIBRARY', name: 'Content Library', description: 'Learning media collection and publishing.', status: 'RETIRED', createdAt: '2026-08-15T01:00:00.000Z', updatedAt: '2026-08-29T09:20:00.000Z' },
  ],
};

const CLIENT_COUNTS: Record<string, number> = {
  'product-pos': 1,
  'product-workshop': 1,
  'product-company-site': 2,
  'product-learning-media': 1,
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

function getDetail(product: Product, features: Record<string, ProductFeature[]>): ProductDetail {
  return { product: copyProduct(product), features: structuredClone(features[product.id] ?? []) };
}

export function createMockProductDataSource(): ProductDataSource {
  const products = PRODUCTS.map(copyProduct);
  const features = structuredClone(FEATURES);
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
      return product ? getDetail(product, features) : null;
    },

    async createProduct(input) {
      const code = normalizeProductCode(input.code);
      if (products.some((product) => product.code === code)) throw new Error('Product code is already in use.');
      const now = getNow();
      const product: Product = { id: `product-${code.toLowerCase()}-${products.length + 1}`, code, name: input.name.trim(), description: input.description?.trim() || undefined, status: 'DRAFT', createdAt: now, updatedAt: now };
      products.unshift(product);
      features[product.id] = [];
      clientCounts[product.id] = 0;
      return getDetail(product, features);
    },

    async updateProduct(productId, input) {
      const product = products.find((candidate) => candidate.id === productId);
      if (!product) throw new Error('Product was not found.');
      product.name = input.name.trim();
      product.description = input.description?.trim() || undefined;
      product.updatedAt = getNow();
      return getDetail(product, features);
    },

    async transitionProductStatus(input) {
      const product = products.find((candidate) => candidate.id === input.productId);
      if (!product) throw new Error('Product was not found.');
      if (!input.reason.trim()) throw new Error('A reason is required for lifecycle changes.');
      if (!VALID_TRANSITIONS[product.status].includes(input.targetStatus)) throw new Error(`Cannot transition ${product.status} to ${input.targetStatus}.`);
      product.status = input.targetStatus;
      product.updatedAt = getNow();
      return getDetail(product, features);
    },
  };
}
