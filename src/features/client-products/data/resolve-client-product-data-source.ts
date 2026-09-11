import { applicationConfig } from '../../../shared/config/application-config';
import type { ClientProductDataSource } from './client-product-data-source';
import { coreClientProductDataSource } from './core-client-product-data-source';
import { createMockClientProductDataSource } from './mock-client-product-data-source';

let source: ClientProductDataSource | undefined;

export function resolveClientProductDataSource(): ClientProductDataSource {
  source ??=
    applicationConfig.dataSourceMode === 'core'
      ? coreClientProductDataSource
      : createMockClientProductDataSource();
  return source;
}
