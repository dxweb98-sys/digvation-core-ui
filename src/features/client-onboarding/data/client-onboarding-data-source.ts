import { applicationConfig } from '../../../shared/config/application-config';
import { coreApiRequest } from '../../../shared/http/core-api-client';
import type {
  ClientOnboardingResult,
  CreateClientOnboardingRequest,
} from '../types/client-onboarding';

interface CoreClientOnboardingResponse {
  onboarding_id: string;
  request_key: string;
  status: ClientOnboardingResult['status'];
  client_id: string | null;
  installation_id: string | null;
  product_relationships: Array<{
    product_id: string;
    client_product_id: string;
    subscription_id: string | null;
    subscription_add_on_ids: string[];
  }>;
  client_capability_ids: string[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientOnboardingDataSource {
  createOrResume(input: CreateClientOnboardingRequest): Promise<ClientOnboardingResult>;
  get(onboardingId: string): Promise<ClientOnboardingResult>;
}

function mapResult(response: CoreClientOnboardingResponse): ClientOnboardingResult {
  return {
    onboardingId: response.onboarding_id,
    requestKey: response.request_key,
    status: response.status,
    clientId: response.client_id ?? undefined,
    installationId: response.installation_id ?? undefined,
    productRelationships: response.product_relationships.map((relationship) => ({
      productId: relationship.product_id,
      clientProductId: relationship.client_product_id,
      subscriptionId: relationship.subscription_id ?? undefined,
      subscriptionAddOnIds: relationship.subscription_add_on_ids,
    })),
    clientCapabilityIds: response.client_capability_ids,
    errorMessage: response.error_message ?? undefined,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

const coreClientOnboardingDataSource: ClientOnboardingDataSource = {
  async createOrResume(input) {
    return mapResult(
      await coreApiRequest<CoreClientOnboardingResponse>('/client-onboardings', {
        method: 'POST',
        body: input,
      }),
    );
  },

  async get(onboardingId) {
    return mapResult(
      await coreApiRequest<CoreClientOnboardingResponse>(
        `/client-onboardings/${onboardingId}`,
      ),
    );
  },
};

const mockClientOnboardingDataSource: ClientOnboardingDataSource = {
  async createOrResume(input) {
    const timestamp = new Date().toISOString();
    return {
      onboardingId: `mock-onboarding-${input.request_key}`,
      requestKey: input.request_key,
      status: 'READY_FOR_PROVISIONING',
      clientId: `mock-client-${input.client.code.toLowerCase()}`,
      installationId: `mock-installation-${input.installation.code.toLowerCase()}`,
      productRelationships: input.products.map((product) => ({
        productId: product.product_id,
        clientProductId: `mock-client-product-${product.product_id}`,
        subscriptionId: product.subscription
          ? `mock-subscription-${product.product_id}`
          : undefined,
        subscriptionAddOnIds: product.add_ons.map(
          (addOn) => `mock-subscription-addon-${addOn.add_on_offering_id}`,
        ),
      })),
      clientCapabilityIds: input.capability_ids.map(
        (capabilityId) => `mock-client-capability-${capabilityId}`,
      ),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  async get(onboardingId) {
    const timestamp = new Date().toISOString();
    return {
      onboardingId,
      requestKey: onboardingId,
      status: 'READY_FOR_PROVISIONING',
      productRelationships: [],
      clientCapabilityIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },
};

export const clientOnboardingDataSource =
  applicationConfig.dataSourceMode === 'core'
    ? coreClientOnboardingDataSource
    : mockClientOnboardingDataSource;
