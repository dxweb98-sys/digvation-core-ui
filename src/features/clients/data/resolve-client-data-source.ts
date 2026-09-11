import { applicationConfig } from '../../../shared/config/application-config';
import type { ClientDataSource } from './client-data-source';
import { coreClientDataSource } from './core-client-data-source';
import { createMockClientDataSource } from './mock-client-data-source';

let source: ClientDataSource | undefined;

export function resolveClientDataSource(): ClientDataSource {
  source ??=
    applicationConfig.dataSourceMode === 'core'
      ? coreClientDataSource
      : createMockClientDataSource();
  return source;
}
