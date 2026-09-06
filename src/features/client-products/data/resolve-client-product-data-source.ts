import type { ClientProductDataSource } from './client-product-data-source';
import { createMockClientProductDataSource } from './mock-client-product-data-source';

export function resolveClientProductDataSource(): ClientProductDataSource {
  return createMockClientProductDataSource();
}
