import type { ClientDataSource } from './client-data-source';
import type {
  Client,
  ClientActivity,
  ClientDetail,
  ClientProductRelationship,
  ClientStatus,
} from '../types/client';
import { normalizeClientCode } from '../schemas/client-form-schema';

const CLIENTS: Client[] = [
  { id: 'client-nova', code: 'NOVA', displayName: 'Nova Salon', legalName: 'PT Nova Beauty Indonesia', status: 'ACTIVE', statusChangedAt: '2026-09-04T08:20:00.000Z', createdAt: '2026-06-12T04:30:00.000Z', updatedAt: '2026-09-06T10:00:00.000Z' },
  { id: 'client-poseidon', code: 'POSEIDON', displayName: 'Poseidon Filter', status: 'ACTIVE', statusChangedAt: '2026-08-18T07:10:00.000Z', createdAt: '2026-07-26T03:15:00.000Z', updatedAt: '2026-09-04T08:40:00.000Z' },
  { id: 'client-fortuna', code: 'FORTUNA', displayName: 'Fortuna Emporos', legalName: 'PT Fortuna Emporos Nusantara', status: 'SUSPENDED', statusChangedAt: '2026-09-01T02:45:00.000Z', createdAt: '2026-08-05T06:00:00.000Z', updatedAt: '2026-09-01T02:45:00.000Z' },
  { id: 'client-leaf', code: 'LEAF', displayName: 'Leaf Lab', status: 'ARCHIVED', statusChangedAt: '2026-08-29T09:20:00.000Z', createdAt: '2026-08-15T01:00:00.000Z', updatedAt: '2026-08-29T09:20:00.000Z' },
];

const PRODUCT_RELATIONSHIPS: Record<string, ClientProductRelationship[]> = {
  'client-nova': [
    { id: 'relationship-nova-pos', productName: 'Digvation POS', status: 'ACTIVE' },
    { id: 'relationship-nova-workshop', productName: 'Digvation Workshop', status: 'PROVISIONING' },
  ],
  'client-poseidon': [{ id: 'relationship-poseidon-web', productName: 'Company Website', status: 'ACTIVE' }],
  'client-fortuna': [{ id: 'relationship-fortuna-web', productName: 'Company Website', status: 'ACTIVE' }],
  'client-leaf': [{ id: 'relationship-leaf-learning', productName: 'Learning Media', status: 'ACTIVE' }],
};

const ACTIVITY: Record<string, ClientActivity[]> = {
  'client-nova': [
    { id: 'activity-nova-updated', type: 'CLIENT_UPDATED', title: 'Client information updated', description: 'Legal entity information was reviewed.', occurredAt: '2026-09-06T10:00:00.000Z' },
    { id: 'activity-nova-created', type: 'CLIENT_CREATED', title: 'Client created', description: 'Nova Salon was registered in the control plane.', occurredAt: '2026-06-12T04:30:00.000Z' },
  ],
  'client-poseidon': [{ id: 'activity-poseidon-created', type: 'CLIENT_CREATED', title: 'Client created', description: 'Poseidon Filter was registered in the control plane.', occurredAt: '2026-07-26T03:15:00.000Z' }],
  'client-fortuna': [{ id: 'activity-fortuna-suspended', type: 'CLIENT_STATUS_CHANGED', title: 'Client suspended', description: 'Lifecycle state changed from Active to Suspended.', occurredAt: '2026-09-01T02:45:00.000Z' }],
  'client-leaf': [{ id: 'activity-leaf-archived', type: 'CLIENT_STATUS_CHANGED', title: 'Client archived', description: 'Lifecycle state changed from Active to Archived.', occurredAt: '2026-08-29T09:20:00.000Z' }],
};

const VALID_TRANSITIONS: Record<ClientStatus, ClientStatus[]> = {
  ACTIVE: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

function copyClient(client: Client): Client {
  return { ...client };
}

function getNow() {
  return new Date().toISOString();
}

function toStatusLabel(status: ClientStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function createMockClientDataSource(): ClientDataSource {
  const clients = CLIENTS.map(copyClient);
  const relationships = structuredClone(PRODUCT_RELATIONSHIPS);
  const activity = structuredClone(ACTIVITY);

  function getDetail(client: Client): ClientDetail {
    return {
      client: copyClient(client),
      productRelationships: [...(relationships[client.id] ?? [])],
      activity: [...(activity[client.id] ?? [])],
    };
  }

  return {
    async getClients(query) {
      const normalizedSearch = query.search.trim().toLowerCase();
      const matchingClients = clients.filter((client) => {
        const hasStatus = query.status === 'ALL' || client.status === query.status;
        const searchableValues = [client.displayName, client.legalName, client.code]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hasStatus && searchableValues.includes(normalizedSearch);
      });
      const totalPages = Math.max(1, Math.ceil(matchingClients.length / query.limit));
      const page = Math.min(Math.max(query.page, 1), totalPages);
      const start = (page - 1) * query.limit;

      return {
        clients: matchingClients.slice(start, start + query.limit).map((client) => ({
          ...copyClient(client),
          productCount: relationships[client.id]?.length ?? 0,
        })),
        total: matchingClients.length,
        totalPages,
      };
    },

    async getClientDetail(clientId) {
      const client = clients.find((candidate) => candidate.id === clientId);
      return client ? getDetail(client) : null;
    },

    async createClient(input) {
      const code = normalizeClientCode(input.code);
      if (clients.some((client) => client.code === code)) {
        throw new Error('Client code is already in use.');
      }
      const now = getNow();
      const client: Client = {
        id: `client-${code.toLowerCase()}-${clients.length + 1}`,
        code,
        displayName: input.displayName.trim(),
        legalName: input.legalName?.trim() || undefined,
        status: 'ACTIVE',
        statusChangedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      clients.unshift(client);
      relationships[client.id] = [];
      activity[client.id] = [{ id: `activity-${client.id}-created`, type: 'CLIENT_CREATED', title: 'Client created', description: `${client.displayName} was registered in the control plane.`, occurredAt: now }];
      return getDetail(client);
    },

    async updateClient(clientId, input) {
      const client = clients.find((candidate) => candidate.id === clientId);
      if (!client) {
        throw new Error('Client was not found.');
      }
      const now = getNow();
      client.displayName = input.displayName.trim();
      client.legalName = input.legalName?.trim() || undefined;
      client.updatedAt = now;
      activity[client.id].unshift({ id: `activity-${client.id}-updated-${Date.now()}`, type: 'CLIENT_UPDATED', title: 'Client information updated', description: 'Display name or legal name was updated.', occurredAt: now });
      return getDetail(client);
    },

    async transitionClientStatus(input) {
      const client = clients.find((candidate) => candidate.id === input.clientId);
      if (!client) {
        throw new Error('Client was not found.');
      }
      if (!input.reason.trim()) {
        throw new Error('A reason is required for lifecycle changes.');
      }
      if (!VALID_TRANSITIONS[client.status].includes(input.targetStatus)) {
        throw new Error(`Cannot transition ${client.status} to ${input.targetStatus}.`);
      }
      const previousStatus = client.status;
      const now = getNow();
      client.status = input.targetStatus;
      client.statusChangedAt = now;
      client.updatedAt = now;
      activity[client.id].unshift({ id: `activity-${client.id}-status-${Date.now()}`, type: 'CLIENT_STATUS_CHANGED', title: `Client ${toStatusLabel(input.targetStatus).toLowerCase()}`, description: `Lifecycle state changed from ${toStatusLabel(previousStatus)} to ${toStatusLabel(input.targetStatus)}. Reason: ${input.reason.trim()}`, occurredAt: now });
      return getDetail(client);
    },
  };
}
