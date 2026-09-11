import type { InstallationListQuery } from '../types/installation';

export const INSTALLATION_QUERY_KEYS = {
  all: ['installations'] as const,
  list: (query: InstallationListQuery) => ['installations', 'list', query] as const,
  detail: (installationId: string) => ['installations', 'detail', installationId] as const,
  clientInstallations: (clientId: string) => ['installations', 'client', clientId] as const,
  clientOptions: ['installations', 'client-options'] as const,
  clientProductOptions: (clientId: string) => ['installations', 'client-product-options', clientId] as const,
};
