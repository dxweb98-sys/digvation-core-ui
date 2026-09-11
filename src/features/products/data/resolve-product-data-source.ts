import { applicationConfig } from '../../../shared/config/application-config';
import type { ProductDataSource } from './product-data-source';
import { coreProductDataSource } from './core-product-data-source';
import { createMockProductDataSource } from './mock-product-data-source';

let source: ProductDataSource | undefined;

export function resolveProductDataSource(): ProductDataSource {
  source ??=
    applicationConfig.dataSourceMode === 'core'
      ? coreProductDataSource
      : createMockProductDataSource();
  return source;
}
