import { getMockCapabilityStore } from '../../capabilities/data/mock-capability-store';
import type { ClientCapabilityDataSource } from './client-capability-data-source';
import type {
  ClientCapability,
  ClientCapabilityStatus,
  ClientCapabilitySummary,
} from '../types/client-capability';

const CLIENT_IDS = new Set([
  'client-nova',
  'client-poseidon',
  'client-fortuna',
  'client-leaf',
]);

const CLIENT_CAPABILITIES: ClientCapability[] = [
  {
    id: 'client-capability-nova-membership',
    clientId: 'client-nova',
    capabilityId: 'capability-membership',
    status: 'ACTIVE',
    statusChangedAt: '2026-08-20T08:30:00.000Z',
    createdAt: '2026-08-20T08:20:00.000Z',
    updatedAt: '2026-08-20T08:30:00.000Z',
  },
];

const VALID_TRANSITIONS: Record<
  ClientCapabilityStatus,
  ClientCapabilityStatus[]
> = {
  PROVISIONING: ['TRIAL', 'ACTIVE', 'CANCELLED'],
  TRIAL: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: ['PROVISIONING', 'DECOMMISSIONED'],
  DECOMMISSIONED: ['PROVISIONING'],
};

function now() {
  return new Date().toISOString();
}

function copyClientCapability(item: ClientCapability): ClientCapability {
  return { ...item };
}

function toSummary(item: ClientCapability): ClientCapabilitySummary {
  const capability = getMockCapabilityStore().find(
    (candidate) => candidate.id === item.capabilityId,
  );
  if (!capability) {
    throw new Error('Client capability references an unavailable capability.');
  }
  return {
    ...copyClientCapability(item),
    capability: {
      id: capability.id,
      code: capability.code,
      name: capability.name,
      description: capability.description,
      status: capability.status,
    },
  };
}

export function createMockClientCapabilityDataSource(): ClientCapabilityDataSource {
  const clientCapabilities = CLIENT_CAPABILITIES.map(copyClientCapability);

  return {
    async getClientCapabilities(clientId) {
      if (!CLIENT_IDS.has(clientId)) {
        throw new Error('Client was not found.');
      }
      return clientCapabilities
        .filter((item) => item.clientId === clientId)
        .map(toSummary);
    },

    async assignClientCapability(input) {
      if (!CLIENT_IDS.has(input.clientId)) {
        throw new Error('Client was not found.');
      }
      const capability = getMockCapabilityStore().find(
        (candidate) => candidate.id === input.capabilityId,
      );
      if (!capability || capability.status !== 'ACTIVE') {
        throw new Error('Capability is not active or was not found.');
      }
      if (
        clientCapabilities.some(
          (item) =>
            item.clientId === input.clientId &&
            item.capabilityId === input.capabilityId,
        )
      ) {
        throw new Error('This capability is already assigned to the client.');
      }

      const timestamp = now();
      const item: ClientCapability = {
        id: `client-capability-${input.clientId}-${input.capabilityId}-${clientCapabilities.length + 1}`,
        clientId: input.clientId,
        capabilityId: input.capabilityId,
        status: 'PROVISIONING',
        statusChangedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      clientCapabilities.unshift(item);
      return copyClientCapability(item);
    },

    async transitionClientCapabilityStatus(input) {
      const item = clientCapabilities.find(
        (candidate) =>
          candidate.id === input.clientCapabilityId &&
          candidate.clientId === input.clientId,
      );
      if (!item) {
        throw new Error('Client capability assignment was not found.');
      }
      if (!input.reason.trim()) {
        throw new Error('A reason is required for lifecycle changes.');
      }
      if (!VALID_TRANSITIONS[item.status].includes(input.targetStatus)) {
        throw new Error(
          `Cannot transition ${item.status} to ${input.targetStatus}.`,
        );
      }
      const timestamp = now();
      item.status = input.targetStatus;
      item.statusChangedAt = timestamp;
      item.updatedAt = timestamp;
      return copyClientCapability(item);
    },
  };
}
