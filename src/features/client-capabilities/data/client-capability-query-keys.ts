export const CLIENT_CAPABILITY_QUERY_KEYS = {
  all: ['client-capabilities'] as const,
  client: (clientId: string) => ['client-capabilities', 'client', clientId] as const,
};
