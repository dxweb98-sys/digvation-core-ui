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

const ACTIVE_PRODUCTS: AssignableProduct[] = [
  { id: 'product-pos', code: 'POS', name: 'Digvation POS' },
];

const PRODUCT_REFERENCES: AssignableProduct[] = [
  ...ACTIVE_PRODUCTS,
  { id: 'product-workshop', code: 'WORKSHOP', name: 'Digvation Workshop' },
  { id: 'product-inventory', code: 'INVENTORY', name: 'Digvation Inventory' },
];

const CLIENT_PRODUCTS: ClientProduct[] = [
  {
    id: 'client-product-nova-pos',
    clientId: 'client-nova',
    productId: 'product-pos',
    status: 'ACTIVE',
    statusChangedAt: '2026-08-20T08:20:00.000Z',
    createdAt: '2026-06-12T04:30:00.000Z',
    updatedAt: '2026-09-06T10:00:00.000Z',
  },
];

const CLIENT_PRODUCT_FEATURES: Record<string, string[]> = {
  'client-product-nova-pos': [
    'feature-pos-sales',
    'feature-pos-checkout',
    'feature-pos-payments',
    'feature-pos-receipts',
    'feature-pos-refunds-voids',
    'feature-pos-cashier-sessions',
  ],
};

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

function resolveClientProduct(
  clientProduct: ClientProduct,
): ClientProductSummary {
  const product = PRODUCT_REFERENCES.find(
    (candidate) => candidate.id === clientProduct.productId,
  );
  if (!product) {
    throw new Error(
      'Product relationship references an unavailable product.',
    );
  }
  return {
    ...copyClientProduct(clientProduct),
    productName: product.name,
    productCode: product.code,
  };
}

function resolveProductClient(
  clientProduct: ClientProduct,
): ProductClientSummary {
  const client = CLIENTS.find(
    (candidate) => candidate.id === clientProduct.clientId,
  );
  if (!client) {
    throw new Error('Product relationship references an unavailable client.');
  }
  return {
    ...copyClientProduct(clientProduct),
    clientDisplayName: client.displayName,
    clientCode: client.code,
  };
}

export function createMockClientProductDataSource(): ClientProductDataSource {
  const clientProducts = CLIENT_PRODUCTS.map(copyClientProduct);
  const clientProductFeatures = structuredClone(CLIENT_PRODUCT_FEATURES);

  return {
    async getClientProducts(clientId) {
      return clientProducts
        .filter((clientProduct) => clientProduct.clientId === clientId)
        .map(resolveClientProduct);
    },

    async getProductClients(productId) {
      return clientProducts
        .filter((clientProduct) => clientProduct.productId === productId)
        .map(resolveProductClient);
    },

    async getAssignableProducts(clientId) {
      const assignedProductIds = new Set(
        clientProducts
          .filter((clientProduct) => clientProduct.clientId === clientId)
          .map((clientProduct) => clientProduct.productId),
      );
      return ACTIVE_PRODUCTS.filter(
        (product) => !assignedProductIds.has(product.id),
      ).map((product) => ({ ...product }));
    },

    async getClientProductFeatureIds(clientProductId) {
      if (!clientProducts.some((item) => item.id === clientProductId)) {
        throw new Error('Client product relationship was not found.');
      }
      return [...(clientProductFeatures[clientProductId] ?? [])];
    },

    async assignProduct(input) {
      if (!CLIENTS.some((client) => client.id === input.clientId)) {
        throw new Error('Client was not found.');
      }
      if (!ACTIVE_PRODUCTS.some((product) => product.id === input.productId)) {
        throw new Error('Product is not active or was not found.');
      }
      if (
        clientProducts.some(
          (clientProduct) =>
            clientProduct.clientId === input.clientId &&
            clientProduct.productId === input.productId,
        )
      ) {
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
      clientProductFeatures[clientProduct.id] = [];
      return copyClientProduct(clientProduct);
    },

    async replaceClientProductFeatures(input) {
      const clientProduct = clientProducts.find(
        (candidate) => candidate.id === input.clientProductId,
      );
      if (!clientProduct) {
        throw new Error('Client product relationship was not found.');
      }
      if (
        clientProduct.status === 'CANCELLED' ||
        clientProduct.status === 'DECOMMISSIONED'
      ) {
        throw new Error(
          'Feature composition cannot be changed for a cancelled or decommissioned product relationship.',
        );
      }
      const featureIds = new Set(input.featureIds);
      if (featureIds.size !== input.featureIds.length) {
        throw new Error('Feature composition contains duplicate entries.');
      }
      clientProductFeatures[input.clientProductId] = [...featureIds];
      clientProduct.updatedAt = now();
    },

    async transitionClientProductStatus(input) {
      const clientProduct = clientProducts.find(
        (candidate) => candidate.id === input.clientProductId,
      );
      if (!clientProduct) {
        throw new Error('Client product relationship was not found.');
      }
      if (!input.reason.trim()) {
        throw new Error('A reason is required for lifecycle changes.');
      }
      if (!VALID_TRANSITIONS[clientProduct.status].includes(input.targetStatus)) {
        throw new Error(
          `Cannot transition ${clientProduct.status} to ${input.targetStatus}.`,
        );
      }
      const timestamp = now();
      clientProduct.status = input.targetStatus;
      clientProduct.statusChangedAt = timestamp;
      clientProduct.updatedAt = timestamp;
      return copyClientProduct(clientProduct);
    },
  };
}
