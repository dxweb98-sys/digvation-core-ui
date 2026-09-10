import type { CapabilityListQuery } from '../types/capability';

export const CAPABILITY_QUERY_KEYS = {
  all: ['capabilities'] as const,
  list: (query: CapabilityListQuery) => ['capabilities', 'list', query] as const,
  detail: (capabilityId: string) => ['capabilities', 'detail', capabilityId] as const,
};
