import type { ProductDataSource } from './product-data-source';
import { createMockProductDataSource } from './mock-product-data-source';

let source: ProductDataSource | undefined;

export function resolveProductDataSource(): ProductDataSource {
  source ??= createMockProductDataSource();
  return source;
}
