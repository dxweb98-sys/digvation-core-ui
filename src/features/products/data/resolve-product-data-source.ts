import type { ProductDataSource } from './product-data-source';
import { createMockProductDataSource } from './mock-product-data-source';

export function resolveProductDataSource(): ProductDataSource {
  return createMockProductDataSource();
}
