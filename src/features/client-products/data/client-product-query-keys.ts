export const CLIENT_PRODUCT_QUERY_KEYS = {
  all: ['client-products'] as const,
  clientProducts: (clientId: string) => ['client-products', 'client', clientId] as const,
  productClients: (productId: string) => ['client-products', 'product', productId] as const,
  assignableProducts: (clientId: string) => ['client-products', 'assignable-products', clientId] as const,
  featureEntitlements: (clientProductId: string) => ['client-products', clientProductId, 'features'] as const,
};
