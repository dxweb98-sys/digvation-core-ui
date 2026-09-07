import type { ClientContactDataSource } from './client-contact-data-source';
import { createMockClientContactDataSource } from './mock-client-contact-data-source';

export function resolveClientContactDataSource(): ClientContactDataSource {
  return createMockClientContactDataSource();
}
