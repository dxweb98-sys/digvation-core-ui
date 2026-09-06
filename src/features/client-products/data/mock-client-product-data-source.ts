import type { ClientProductDataSource } from './client-product-data-source';
import type {
  AssignableProduct,
  ClientProduct,
  ClientProductStatus,
  ClientProductSummary,
  ProductClientSummary,
} from '../types/client-product';

const CLIENTS = [
  { id: 'client-nova', code: 'NOVA', displayName: 'Nova Salon' },
  { id: 'client-poseidon', code: 'POSEIDON', displayName: 'Poseidon Filter' },
  { id: 'client-fortuna', code: 'FORTUNA', displayName: 'Fortuna Emporos' },
  { id: 'client-leaf', code: 'LEAF', displayName: 'Leaf Lab' },
] as const;

const PRODUCTS: AssignableProduct[] = [
  { id: 'product-pos', code: 'DIGVATION-POS', name: 'Digvation POS' },
  { id: 'product-workshop', code: 'DIGVATION-WORKSHOP', name: 'Digvation Workshop' },
  { id: 'product-company-site', code: 'COMPANY-SITE', name: 'Company Website' },
  { id: 'product-learning-media', code: 'LEARNING-MEDIA', name: 'Learning Media' },
];

const CLIENT_PRODUCTS: ClientProduct[] = [
  { id: 'client-product-nova-pos', clientId: 'client-nova', productId: 'product-pos', status: 'ACTIVE', statusChangedAt: '2026-08-20T08:20:00.000Z', createdAt: '2026-06-12T04:30:00.000Z', updatedAt: '2026-09-06T10:00:00.000Z' },
  { id: 'client-product-nova-workshop', clientId: 'client-nova', productId: 'product-workshop', status: 'PROVISIONING', statusChangedAt: '2026-09-05T09:00:00.000Z', createdAt: '2026-09-05T09:00:00.000Z', updatedAt: '2026-09-05T09:00:00.000Z' },
  { id: 'client-product-poseidon-site', clientId: 'client-poseidon', productId: 'product-company-site', status: 'ACTIVE', statusChangedAt: '2026-08-01T07:10:00.000Z', createdAt: '2026-07-26T03:15:00.000Z', updatedAt: '2026-09-04T08:40:00.000Z' },
  { id: 'client-product-fortuna-site', clientId: 'client-fortuna', productId: 'product-company-site', status: 'SUSPENDED', statusChangedAt: '2026-09-01T02:45:00.000Z', createdAt: '2026-08-05T06:00:00.000Z', updatedAt: '2026-09-01T02:45:00.000Z' },
  { id: 'client-product-leaf-learning', clientId: 'client-leaf', productId: 'product-learning-media', status: 'CANCELLED', statusChangedAt: '2026-08-29T09:20:00.000Z', createdAt: '2026-08-15T01:00:00.000Z', updatedAt: '2026-08-29T09:20:00.000Z' },
];

const VALID_TRANSITIONS: Record<ClientProductStatus, ClientProductStatus[]> = {
  PROVISIONING: ['TRIAL', 'ACTIVE', 'CANCELLED'],
  TRIAL: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: ['PROVISIONING', 'DECOMMISSIONED'],
  DECOMMISSIONED: ['PROVISIONING'],
};

function now() {
  return new Date().toISOString();
}

function copyClientProduct(clientProduct: ClientProduct): ClientProduct {
  return { ...clientProduct };
}

function resolveClientProduct(clientProduct: ClientProduct): ClientProductSummary {
  const product = PRODUCTS.find((candidate) => candidate.id === clientProduct.productId);
  if (!product) throw new Error('Product relationship references an unavailable product.');
  return { ...copyClientProduct(clientProduct), productName: product.name, productCode: product.code };
}

function resolveProductClient(clientProduct: ClientProduct): ProductClientSummary {
  const client = CLIENTS.find((candidate) => candidate.id === clientProduct.clientId);
  if (!client) throw new Error('Product relationship references an unavailable client.');
  return { ...copyClientProduct(clientProduct), clientDisplayName: client.displayName, clientCode: client.code };
}

export function createMockClientProductDataSource(): ClientProductDataSource {
  const clientProducts = CLIENT_PRODUCTS.map(copyClientProduct);

  return {
    async getClientProducts(clientId) {
      return clientProducts.filter((clientProduct) => clientProduct.clientId === clientId).map(resolveClientProduct);
    },

    async getProductClients(productId) {
      return clientProducts.filter((clientProduct) => clientProduct.productId === productId).map(resolveProductClient);
    },

    async getAssignableProducts(clientId) {
      const assignedProductIds = new Set(clientProducts.filter((clientProduct) => clientProduct.clientId === clientId).map((clientProduct) => clientProduct.productId));
      return PRODUCTS.filter((product) => !assignedProductIds.has(product.id)).map((product) => ({ ...product }));
    },

    async assignProduct(input) {
      if (!CLIENTS.some((client) => client.id === input.clientId)) throw new Error('Client was not found.');
      if (!PRODUCTS.some((product) => product.id === input.productId)) throw new Error('Product was not found.');
      if (clientProducts.some((clientProduct) => clientProduct.clientId === input.clientId && clientProduct.productId === input.productId)) {
        throw new Error('This product is already assigned to the client.');
      }
      const timestamp = now();
      const clientProduct: ClientProduct = {
        id: `client-product-${input.clientId}-${input.productId}-${clientProducts.length + 1}`,
        clientId: input.clientId,
        productId: input.productId,
        status: 'PROVISIONING',
        statusChangedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      clientProducts.unshift(clientProduct);
      return copyClientProduct(clientProduct);
    },

    async transitionClientProductStatus(input) {
      const clientProduct = clientProducts.find((candidate) => candidate.id === input.clientProductId);
      if (!clientProduct) throw new Error('Client product relationship was not found.');
      if (!input.reason.trim()) throw new Error('A reason is required for lifecycle changes.');
      if (!VALID_TRANSITIONS[clientProduct.status].includes(input.targetStatus)) {
        throw new Error(`Cannot transition ${clientProduct.status} to ${input.targetStatus}.`);
      }
      const timestamp = now();
      clientProduct.status = input.targetStatus;
      clientProduct.statusChangedAt = timestamp;
      clientProduct.updatedAt = timestamp;
      return copyClientProduct(clientProduct);
    },
  };
}
