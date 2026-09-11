import { applicationConfig } from '../../../shared/config/application-config';
import type { CommercialCatalogDataSource } from './commercial-catalog-data-source';
import { coreCommercialCatalogDataSource } from './core-commercial-catalog-data-source';
import { createMockCommercialCatalogDataSource } from './mock-commercial-catalog-data-source';

let source: CommercialCatalogDataSource | undefined;

export function resolveCommercialCatalogDataSource(): CommercialCatalogDataSource {
  source ??=
    applicationConfig.dataSourceMode === 'core'
      ? coreCommercialCatalogDataSource
      : createMockCommercialCatalogDataSource();
  return source;
}
