import { applicationConfig } from '../../../shared/config/application-config';
import type { CapabilityDataSource } from './capability-data-source';
import { coreCapabilityDataSource } from './core-capability-data-source';
import { createMockCapabilityDataSource } from './mock-capability-data-source';

let source: CapabilityDataSource | undefined;

export function resolveCapabilityDataSource(): CapabilityDataSource {
  source ??=
    applicationConfig.dataSourceMode === 'core'
      ? coreCapabilityDataSource
      : createMockCapabilityDataSource();
  return source;
}
