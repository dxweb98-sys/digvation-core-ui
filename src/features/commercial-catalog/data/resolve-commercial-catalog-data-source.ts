import { createMockCommercialCatalogDataSource } from './mock-commercial-catalog-data-source';
import type { CommercialCatalogDataSource } from './commercial-catalog-data-source';

let source: CommercialCatalogDataSource | undefined;

export function resolveCommercialCatalogDataSource(): CommercialCatalogDataSource {
  source ??= createMockCommercialCatalogDataSource();
  return source;
}
