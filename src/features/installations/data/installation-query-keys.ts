import type { InstallationListQuery } from '../types/installation';

export const INSTALLATION_QUERY_KEYS = {
  all: ['installations'] as const,
  list: (query: InstallationListQuery) => ['installations', 'list', query] as const,
  detail: (installationId: string) => ['installations', 'detail', installationId] as const,
  clientInstallations: (clientId: string) => ['installations', 'client', clientId] as const,
  clientProductOptions: ['installations', 'client-product-options'] as const,
};
