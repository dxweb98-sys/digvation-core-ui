import type { ClientFormValues } from '../../clients/schemas/client-form-schema';
import type {
  BillingCycle,
  CommercialAdjustmentType,
} from '../../commercial-catalog/types/commercial-catalog';
import type {
  BrandingMode,
  DeploymentMode,
  InfrastructureOwnership,
  InstallationEnvironment,
} from '../../installations/types/installation';

export type ClientProductRelationshipStatus = 'PROVISIONING' | 'TRIAL' | 'ACTIVE';
export type ClientOnboardingStatus = 'PROCESSING' | 'FAILED' | 'READY_FOR_PROVISIONING';

export interface OnboardingSubscriptionDraft {
  enabled: boolean;
  startsAt: string;
  endsAt?: string;
  billingCycle?: BillingCycle;
  currency?: string;
  listAmountMinor?: number;
  agreedAmountMinor?: number;
  adjustmentType: CommercialAdjustmentType;
  adjustmentReason?: string;
  autoRenew: boolean;
  renewalNoticeDays: number;
  gracePeriodDays?: number;
  contractReference?: string;
  paymentTermsDays?: number;
  addOnOfferingIds: string[];
}

export interface OnboardingProductDraft {
  productId: string;
  relationshipStatus: ClientProductRelationshipStatus;
  featureIds: string[];
  subscription: OnboardingSubscriptionDraft;
}

export interface OnboardingBrandingDraft {
  mode: BrandingMode;
  brandName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  supportName?: string;
  supportEmail?: string;
}

export interface OnboardingInstallationDraft {
  code: string;
  name: string;
  environment: InstallationEnvironment;
  deploymentMode: DeploymentMode;
  infrastructureOwnership: InfrastructureOwnership;
  managedByDigvation: boolean;
  region?: string;
  applicationUrl?: string;
  branding: OnboardingBrandingDraft;
}

export interface ClientOnboardingDraft {
  client: ClientFormValues;
  products: OnboardingProductDraft[];
  capabilityIds: string[];
  installation: OnboardingInstallationDraft;
}

export interface CreateClientOnboardingRequest {
  request_key: string;
  client: {
    code: string;
    display_name: string;
    legal_name?: string;
    organization_email?: string;
    organization_phone?: string;
    website?: string;
    tax_identifier?: string;
    country?: string;
    timezone?: string;
    address?: string;
    notes?: string;
  };
  products: Array<{
    product_id: string;
    feature_ids: string[];
    relationship_status: ClientProductRelationshipStatus;
    subscription?: {
      starts_at: string;
      ends_at?: string;
      billing_cycle: BillingCycle;
      currency: string;
      agreed_amount_minor?: number;
      adjustment_type: CommercialAdjustmentType;
      adjustment_reason?: string;
      auto_renew: boolean;
      renewal_notice_days: number;
      grace_period_days?: number;
      contract_reference?: string;
      payment_terms_days?: number;
    };
    add_ons: Array<{
      add_on_offering_id: string;
      effective_from: string;
      adjustment_type: CommercialAdjustmentType;
    }>;
  }>;
  capability_ids: string[];
  installation: {
    code: string;
    name: string;
    environment: InstallationEnvironment;
    deployment_mode: DeploymentMode;
    infrastructure_ownership: InfrastructureOwnership;
    managed_by_digvation: boolean;
    region?: string;
    application_url?: string;
    branding: {
      mode: BrandingMode;
      brand_name?: string;
      logo_url?: string;
      favicon_url?: string;
      primary_color?: string;
      secondary_color?: string;
      custom_domain?: string;
      support_name?: string;
      support_email?: string;
    };
  };
}

export interface ClientOnboardingProductResult {
  productId: string;
  clientProductId: string;
  subscriptionId?: string;
  subscriptionAddOnIds: string[];
}

export interface ClientOnboardingResult {
  onboardingId: string;
  requestKey: string;
  status: ClientOnboardingStatus;
  clientId?: string;
  installationId?: string;
  productRelationships: ClientOnboardingProductResult[];
  clientCapabilityIds: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
