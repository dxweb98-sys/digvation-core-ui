export const CLIENT_CONTACT_QUERY_KEYS = { all: ['client-contacts'] as const, byClient: (clientId: string) => ['client-contacts', clientId] as const };
