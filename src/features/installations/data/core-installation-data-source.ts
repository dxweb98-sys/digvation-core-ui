import {
  CoreApiError,
  coreApiRequest,
} from '../../../shared/http/core-api-client';
import type { InstallationDataSource } from './installation-data-source';
import type {
  BrandingProfile,
  ClientOption,
  ClientProductOption,
  Installation,
  InstallationListQuery,
  InstallationSummary,
} from '../types/installation';

interface CoreInstallationProduct {
  client_product_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  client_product_status: ClientProductOption['status'];
}

interface CoreBrandingProfile {
  id: string;
  mode: BrandingProfile['mode'];
  brand_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  custom_domain: string | null;
  support_name: string | null;
  support_email: string | null;
  created_at: string;
  updated_at: string;
}

interface CoreInstallation {
  id: string;
  client_id: string;
  client_code: string;
  client_name: string;
  code: string;
  name: string;
  environment: Installation['environment'];
  status: Installation['status'];
  deployment_mode: Installation['deploymentMode'];
  infrastructure_ownership: Installation['infrastructureOwnership'];
  managed_by_digvation: boolean;
  region: string | null;
  application_url: string | null;
  status_changed_at: string;
  products: CoreInstallationProduct[];
  branding: CoreBrandingProfile;
  created_at: string;
  updated_at: string;
}

interface CoreInstallationList {
  items: CoreInstallation[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

interface CoreClientList {
  items: Array<{
    id: string;
    code: string;
    display_name: string;
    status: ClientOption['status'];
  }>;
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

interface CoreClientProductList {
  items: Array<{
    id: string;
    status: ClientProductOption['status'];
    client: { id: string };
    product: { id: string; code: string; name: string };
  }>;
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

interface InstallationMutationResponse {
  installation_id: string;
}

function optional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function queryString(query: InstallationListQuery) {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });
  const search = query.search.trim();
  if (search) params.set('search', search);
  if (query.status !== 'ALL') params.set('status', query.status);
  if (query.environment !== 'ALL') params.set('environment', query.environment);
  if (query.clientId) params.set('client_id', query.clientId);
  return params.toString();
}

function mapBranding(item: CoreBrandingProfile): BrandingProfile {
  return {
    id: item.id,
    mode: item.mode,
    brandName: item.brand_name ?? undefined,
    logoUrl: item.logo_url ?? undefined,
    faviconUrl: item.favicon_url ?? undefined,
    primaryColor: item.primary_color ?? undefined,
    secondaryColor: item.secondary_color ?? undefined,
    customDomain: item.custom_domain ?? undefined,
    supportName: item.support_name ?? undefined,
    supportEmail: item.support_email ?? undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapInstallation(item: CoreInstallation): InstallationSummary {
  return {
    id: item.id,
    clientId: item.client_id,
    clientCode: item.client_code,
    clientName: item.client_name,
    code: item.code,
    name: item.name,
    environment: item.environment,
    status: item.status,
    deploymentMode: item.deployment_mode,
    infrastructureOwnership: item.infrastructure_ownership,
    managedByDigvation: item.managed_by_digvation,
    region: item.region ?? undefined,
    applicationUrl: item.application_url ?? undefined,
    statusChangedAt: item.status_changed_at,
    products: item.products.map((product) => ({
      clientProductId: product.client_product_id,
      productId: product.product_id,
      productCode: product.product_code,
      productName: product.product_name,
      clientProductStatus: product.client_product_status,
    })),
    branding: mapBranding(item.branding),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function brandingPayload(branding: BrandingProfile) {
  return {
    mode: branding.mode,
    ...(branding.mode === 'WHITE_LABEL'
      ? {
          brand_name: branding.brandName?.trim(),
          logo_url: optional(branding.logoUrl),
          favicon_url: optional(branding.faviconUrl),
          primary_color: optional(branding.primaryColor),
          secondary_color: optional(branding.secondaryColor),
          custom_domain: optional(branding.customDomain),
          support_name: optional(branding.supportName),
          support_email: optional(branding.supportEmail),
        }
      : {}),
  };
}

async function detailOrThrow(installationId: string) {
  const detail = await coreInstallationDataSource.getInstallation(installationId);
  if (!detail) throw new Error('Installation was not found after the operation.');
  return detail;
}

async function allClients() {
  const first = await coreApiRequest<CoreClientList>('/clients?status=ACTIVE&page=1&limit=100');
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.total_pages; page += 1) {
    const response = await coreApiRequest<CoreClientList>(`/clients?status=ACTIVE&page=${page}&limit=100`);
    items.push(...response.items);
  }
  return items;
}

export const coreInstallationDataSource: InstallationDataSource = {
  async getInstallations(query) {
    const response = await coreApiRequest<CoreInstallationList>(
      `/installations?${queryString(query)}`,
    );
    return {
      installations: response.items.map(mapInstallation),
      total: response.pagination.total,
      totalPages: response.pagination.total_pages,
    };
  },

  async getInstallation(installationId) {
    try {
      return mapInstallation(
        await coreApiRequest<CoreInstallation>(`/installations/${installationId}`),
      );
    } catch (error) {
      if (error instanceof CoreApiError && error.status === 404) return null;
      throw error;
    }
  },

  async getClientInstallations(clientId) {
    const response = await coreApiRequest<CoreInstallationList>(
      `/installations?client_id=${encodeURIComponent(clientId)}&page=1&limit=100`,
    );
    return response.items.map(mapInstallation);
  },

  async getClientOptions() {
    return (await allClients()).map<ClientOption>((client) => ({
      id: client.id,
      label: `${client.display_name} · ${client.code}`,
      status: client.status,
    }));
  },

  async getClientProductOptions(clientId) {
    if (!clientId) return [];
    const response = await coreApiRequest<CoreClientProductList>(
      `/client-products?client_id=${encodeURIComponent(clientId)}&page=1&limit=100`,
    );
    return response.items
      .filter((item) => !['CANCELLED', 'DECOMMISSIONED'].includes(item.status))
      .map<ClientProductOption>((item) => ({
        id: item.id,
        clientId: item.client.id,
        productId: item.product.id,
        productCode: item.product.code,
        productName: item.product.name,
        status: item.status,
        label: `${item.product.name} · ${item.product.code}`,
      }));
  },

  async createInstallation(input) {
    const response = await coreApiRequest<InstallationMutationResponse>('/installations', {
      method: 'POST',
      body: {
        client_id: input.clientId,
        client_product_ids: input.clientProductIds,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        environment: input.environment,
        deployment_mode: input.deploymentMode,
        infrastructure_ownership: input.infrastructureOwnership,
        managed_by_digvation: input.managedByDigvation,
        region: optional(input.region),
        application_url: optional(input.applicationUrl),
        branding: brandingPayload(input.branding),
      },
    });
    return detailOrThrow(response.installation_id);
  },

  async updateInstallation(installationId, input) {
    await coreApiRequest(`/installations/${installationId}`, {
      method: 'PATCH',
      body: {
        name: input.name.trim(),
        environment: input.environment,
        deployment_mode: input.deploymentMode,
        infrastructure_ownership: input.infrastructureOwnership,
        managed_by_digvation: input.managedByDigvation,
        region: optional(input.region) ?? null,
        application_url: optional(input.applicationUrl) ?? null,
      },
    });
    return detailOrThrow(installationId);
  },

  async replaceInstallationProducts(input) {
    await coreApiRequest(`/installations/${input.installationId}/products`, {
      method: 'PUT',
      body: { client_product_ids: input.clientProductIds },
    });
    return detailOrThrow(input.installationId);
  },

  async updateInstallationBranding(input) {
    await coreApiRequest(`/installations/${input.installationId}/branding`, {
      method: 'PUT',
      body: brandingPayload(input.branding),
    });
    return detailOrThrow(input.installationId);
  },

  async transitionInstallationStatus(input) {
    await coreApiRequest(`/installations/${input.installationId}/status`, {
      method: 'PATCH',
      body: { target_status: input.targetStatus, reason: input.reason },
    });
    return detailOrThrow(input.installationId);
  },
};
