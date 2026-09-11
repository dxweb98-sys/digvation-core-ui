import { applicationConfig } from '../../../shared/config/application-config';
import type { ClientCapabilityDataSource } from './client-capability-data-source';
import { coreClientCapabilityDataSource } from './core-client-capability-data-source';
import { createMockClientCapabilityDataSource } from './mock-client-capability-data-source';

let source: ClientCapabilityDataSource | undefined;

export function resolveClientCapabilityDataSource(): ClientCapabilityDataSource {
  source ??=
    applicationConfig.dataSourceMode === 'core'
      ? coreClientCapabilityDataSource
      : createMockClientCapabilityDataSource();
  return source;
}
