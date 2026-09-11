export type InstallationEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
export type InstallationStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'DECOMMISSIONED';
export type DeploymentMode = 'SHARED' | 'DEDICATED';
export type InfrastructureOwnership = 'DIGVATION' | 'CLIENT';
export type BrandingMode = 'DIGVATION' | 'WHITE_LABEL';
export type ClientProductLifecycleStatus =
  | 'PROVISIONING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'DECOMMISSIONED';

export interface InstallationProductBinding {
  clientProductId: string;
  productId: string;
  productCode: string;
  productName: string;
  clientProductStatus: ClientProductLifecycleStatus;
}

export interface BrandingProfile {
  id?: string;
  mode: BrandingMode;
  brandName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  supportName?: string;
  supportEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Installation {
  id: string;
  clientId: string;
  clientCode: string;
  clientName: string;
  code: string;
  name: string;
  environment: InstallationEnvironment;
  status: InstallationStatus;
  deploymentMode: DeploymentMode;
  infrastructureOwnership: InfrastructureOwnership;
  managedByDigvation: boolean;
  region?: string;
  applicationUrl?: string;
  statusChangedAt: string;
  products: InstallationProductBinding[];
  branding: BrandingProfile;
  createdAt: string;
  updatedAt: string;
}

export type InstallationSummary = Installation;

export interface ClientOption {
  id: string;
  label: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
}

export interface ClientProductOption {
  id: string;
  clientId: string;
  productId: string;
  productCode: string;
  productName: string;
  status: ClientProductLifecycleStatus;
  label: string;
}

export interface InstallationListQuery {
  search: string;
  status: InstallationStatus | 'ALL';
  environment: InstallationEnvironment | 'ALL';
  clientId?: string;
  page: number;
  limit: number;
}

export interface InstallationListResult {
  installations: InstallationSummary[];
  total: number;
  totalPages: number;
}

export interface CreateInstallationInput {
  clientId: string;
  clientProductIds: string[];
  code: string;
  name: string;
  environment: InstallationEnvironment;
  deploymentMode: DeploymentMode;
  infrastructureOwnership: InfrastructureOwnership;
  managedByDigvation: boolean;
  region?: string;
  applicationUrl?: string;
  branding: BrandingProfile;
}

export interface UpdateInstallationInput {
  name: string;
  environment: InstallationEnvironment;
  deploymentMode: DeploymentMode;
  infrastructureOwnership: InfrastructureOwnership;
  managedByDigvation: boolean;
  region?: string;
  applicationUrl?: string;
}

export interface ReplaceInstallationProductsInput {
  installationId: string;
  clientProductIds: string[];
}

export interface UpdateInstallationBrandingInput {
  installationId: string;
  branding: BrandingProfile;
}

export interface InstallationStatusTransitionInput {
  installationId: string;
  targetStatus: InstallationStatus;
  reason: string;
}
