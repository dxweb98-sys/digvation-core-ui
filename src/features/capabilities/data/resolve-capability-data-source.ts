import type { CapabilityDataSource } from './capability-data-source';
import { createMockCapabilityDataSource } from './mock-capability-data-source';

export function resolveCapabilityDataSource(): CapabilityDataSource {
  return createMockCapabilityDataSource();
}
