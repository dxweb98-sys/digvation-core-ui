import type { ClientListQuery } from '../types/client';

export const CLIENT_QUERY_KEYS = {
  all: ['clients'] as const,
  list: (query: ClientListQuery) => ['clients', 'list', query] as const,
  detail: (clientId: string) => ['clients', 'detail', clientId] as const,
};
