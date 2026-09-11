import type { ClientCapabilityDataSource } from './client-capability-data-source';
import { createMockClientCapabilityDataSource } from './mock-client-capability-data-source';

export function resolveClientCapabilityDataSource(): ClientCapabilityDataSource {
  return createMockClientCapabilityDataSource();
}
