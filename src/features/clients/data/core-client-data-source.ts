import {
  CoreApiError,
  coreApiRequest,
} from '../../../shared/http/core-api-client';
import type { ClientDataSource } from './client-data-source';
import type { Client, ClientDetail, ClientListItem } from '../types/client';

interface CoreClient {
  id: string;
  code: string;
  display_name: string;
  legal_name: string | null;
  organization_email: string | null;
  organization_phone: string | null;
  website: string | null;
  tax_identifier: string | null;
  country: string | null;
  timezone: string | null;
  address: string | null;
  notes: string | null;
  status: Client['status'];
  status_changed_at: string;
  created_at: string;
  updated_at: string;
}

interface CoreClientListItem extends CoreClient {
  product_count: number;
}

interface CoreClientListResponse {
  items: CoreClientListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ClientMutationResponse {
  client_id: string;
}

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function mapClient(item: CoreClient): Client {
  return {
    id: item.id,
    code: item.code,
    displayName: item.display_name,
    legalName: item.legal_name ?? undefined,
    organizationEmail: item.organization_email ?? undefined,
    organizationPhone: item.organization_phone ?? undefined,
    website: item.website ?? undefined,
    taxIdentifier: item.tax_identifier ?? undefined,
    country: item.country ?? undefined,
    timezone: item.timezone ?? undefined,
    address: item.address ?? undefined,
    notes: item.notes ?? undefined,
    status: item.status,
    statusChangedAt: item.status_changed_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapListItem(item: CoreClientListItem): ClientListItem {
  return {
    ...mapClient(item),
    productCount: item.product_count,
  };
}

function profilePayload(input: {
  displayName: string;
  legalName?: string;
  organizationEmail?: string;
  organizationPhone?: string;
  website?: string;
  taxIdentifier?: string;
  country?: string;
  timezone?: string;
  address?: string;
  notes?: string;
}) {
  return {
    display_name: input.displayName.trim(),
    legal_name: input.legalName?.trim() || null,
    organization_email: input.organizationEmail?.trim() || null,
    organization_phone: input.organizationPhone?.trim() || null,
    website: input.website?.trim() || null,
    tax_identifier: input.taxIdentifier?.trim() || null,
    country: input.country?.trim() || null,
    timezone: input.timezone?.trim() || null,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

async function detailOrThrow(clientId: string) {
  const detail = await coreClientDataSource.getClientDetail(clientId);
  if (!detail) throw new Error('Client was not found after the operation.');
  return detail;
}

export const coreClientDataSource: ClientDataSource = {
  async getClients(query) {
    const response = await coreApiRequest<CoreClientListResponse>(
      `/clients${queryString({
        search: query.search.trim() || undefined,
        status: query.status === 'ALL' ? undefined : query.status,
        page: query.page,
        limit: query.limit,
      })}`,
    );
    return {
      clients: response.items.map(mapListItem),
      total: response.pagination.total,
      totalPages: response.pagination.total_pages,
    };
  },

  async getClientDetail(clientId) {
    try {
      const client = mapClient(
        await coreApiRequest<CoreClient>(`/clients/${clientId}`),
      );
      const detail: ClientDetail = { client, activity: [] };
      return detail;
    } catch (error) {
      if (error instanceof CoreApiError && error.status === 404) return null;
      throw error;
    }
  },

  async createClient(input) {
    const result = await coreApiRequest<ClientMutationResponse>('/clients', {
      method: 'POST',
      body: {
        code: input.code,
        display_name: input.displayName.trim(),
        legal_name: input.legalName?.trim() || undefined,
      },
    });
    return detailOrThrow(result.client_id);
  },

  async updateClient(clientId, input) {
    await coreApiRequest<ClientMutationResponse>(`/clients/${clientId}`, {
      method: 'PATCH',
      body: profilePayload(input),
    });
    return detailOrThrow(clientId);
  },

  async transitionClientStatus(input) {
    await coreApiRequest(`/clients/${input.clientId}/status`, {
      method: 'PATCH',
      body: {
        target_status: input.targetStatus,
        reason: input.reason,
      },
    });
    return detailOrThrow(input.clientId);
  },
};
