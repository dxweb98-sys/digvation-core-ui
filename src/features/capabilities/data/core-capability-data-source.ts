import {
  CoreApiError,
  coreApiRequest,
} from '../../../shared/http/core-api-client';
import type { CapabilityDataSource } from './capability-data-source';
import type { Capability } from '../types/capability';

interface CoreCapability {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: Capability['status'];
  status_changed_at: string;
  created_at: string;
  updated_at: string;
}

interface CoreCapabilityListResponse {
  items: CoreCapability[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface CapabilityMutationResponse {
  capability_id: string;
}

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function mapCapability(item: CoreCapability): Capability {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? undefined,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

async function capabilityOrThrow(capabilityId: string) {
  const capability = await coreCapabilityDataSource.getCapability(capabilityId);
  if (!capability) {
    throw new Error('Capability was not found after the operation.');
  }
  return capability;
}

export const coreCapabilityDataSource: CapabilityDataSource = {
  async getCapabilities(query) {
    const response = await coreApiRequest<CoreCapabilityListResponse>(
      `/capabilities${queryString({
        search: query.search.trim() || undefined,
        status: query.status === 'ALL' ? undefined : query.status,
        page: query.page,
        limit: query.limit,
      })}`,
    );
    return {
      capabilities: response.items.map(mapCapability),
      total: response.pagination.total,
      totalPages: response.pagination.total_pages,
    };
  },

  async getCapability(capabilityId) {
    try {
      return mapCapability(
        await coreApiRequest<CoreCapability>(
          `/capabilities/${capabilityId}`,
        ),
      );
    } catch (error) {
      if (error instanceof CoreApiError && error.status === 404) return null;
      throw error;
    }
  },

  async createCapability(input) {
    const result = await coreApiRequest<CapabilityMutationResponse>(
      '/capabilities',
      {
        method: 'POST',
        body: {
          code: input.code,
          name: input.name,
          description: input.description?.trim() || undefined,
        },
      },
    );
    return capabilityOrThrow(result.capability_id);
  },

  async updateCapability(capabilityId, input) {
    await coreApiRequest<CapabilityMutationResponse>(
      `/capabilities/${capabilityId}`,
      {
        method: 'PATCH',
        body: {
          name: input.name,
          description: input.description?.trim() || null,
        },
      },
    );
    return capabilityOrThrow(capabilityId);
  },

  async transitionCapabilityStatus(input) {
    await coreApiRequest(`/capabilities/${input.capabilityId}/status`, {
      method: 'PATCH',
      body: {
        target_status: input.targetStatus,
        reason: input.reason,
      },
    });
    return capabilityOrThrow(input.capabilityId);
  },
};
