import type { ClientDataSource } from './client-data-source';
import { createMockClientDataSource } from './mock-client-data-source';

export function resolveClientDataSource(): ClientDataSource {
  return createMockClientDataSource();
}
