import { coreApiRequest } from '../../../shared/http/core-api-client';
import type { ClientCapabilityDataSource } from './client-capability-data-source';
import type {
  ClientCapability,
  ClientCapabilitySummary,
} from '../types/client-capability';

interface CoreClientCapability {
  id: string;
  status: ClientCapability['status'];
  status_changed_at: string;
  client_id: string;
  client_code: string;
  client_status: string;
  capability: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    status: ClientCapabilitySummary['capability']['status'];
  };
  created_at: string;
  updated_at: string;
}

interface CoreClientCapabilityList {
  items: CoreClientCapability[];
}

interface ClientCapabilityMutationResponse {
  client_capability_id: string;
}

function mapCapability(item: CoreClientCapability): ClientCapabilitySummary {
  return {
    id: item.id,
    clientId: item.client_id,
    capabilityId: item.capability.id,
    status: item.status,
    statusChangedAt: item.status_changed_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    capability: {
      id: item.capability.id,
      code: item.capability.code,
      name: item.capability.name,
      description: item.capability.description ?? undefined,
      status: item.capability.status,
    },
  };
}

async function list(clientId: string) {
  const response = await coreApiRequest<CoreClientCapabilityList>(
    `/clients/${clientId}/capabilities`,
  );
  return response.items.map(mapCapability);
}

async function findOrThrow(clientId: string, clientCapabilityId: string) {
  const item = (await list(clientId)).find(
    (candidate) => candidate.id === clientCapabilityId,
  );
  if (!item) {
    throw new Error('Client capability was not found after the operation.');
  }
  return item;
}

export const coreClientCapabilityDataSource: ClientCapabilityDataSource = {
  async getClientCapabilities(clientId) {
    return list(clientId);
  },

  async assignClientCapability(input) {
    const response = await coreApiRequest<ClientCapabilityMutationResponse>(
      `/clients/${input.clientId}/capabilities`,
      {
        method: 'POST',
        body: { capability_id: input.capabilityId },
      },
    );
    const item = await findOrThrow(
      input.clientId,
      response.client_capability_id,
    );
    return {
      id: item.id,
      clientId: item.clientId,
      capabilityId: item.capabilityId,
      status: item.status,
      statusChangedAt: item.statusChangedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  },

  async transitionClientCapabilityStatus(input) {
    await coreApiRequest(
      `/clients/${input.clientId}/capabilities/${input.clientCapabilityId}/status`,
      {
        method: 'PATCH',
        body: {
          target_status: input.targetStatus,
          reason: input.reason,
        },
      },
    );
    const item = await findOrThrow(
      input.clientId,
      input.clientCapabilityId,
    );
    return {
      id: item.id,
      clientId: item.clientId,
      capabilityId: item.capabilityId,
      status: item.status,
      statusChangedAt: item.statusChangedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  },
};
