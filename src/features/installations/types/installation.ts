export type InstallationEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
export type InstallationStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'DECOMMISSIONED';
export type DeploymentMode = 'SHARED' | 'DEDICATED';
export type InfrastructureOwnership = 'DIGVATION' | 'CLIENT';

export interface Installation {
  id: string;
  clientProductId: string;
  code: string;
  name: string;
  environment: InstallationEnvironment;
  status: InstallationStatus;
  deploymentMode: DeploymentMode;
  infrastructureOwnership: InfrastructureOwnership;
  managedByDigvation: boolean;
  region?: string;
  applicationUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallationSummary extends Installation {
  clientId: string;
  clientName: string;
  productName: string;
  productCode: string;
}

export interface ClientProductOption {
  id: string;
  label: string;
}

export interface InstallationListQuery {
  search: string;
  status: InstallationStatus | 'ALL';
  environment: InstallationEnvironment | 'ALL';
  page: number;
  limit: number;
}

export interface InstallationListResult {
  installations: InstallationSummary[];
  total: number;
  totalPages: number;
}

export interface CreateInstallationInput {
  clientProductId: string;
  code: string;
  name: string;
  environment: InstallationEnvironment;
  deploymentMode: DeploymentMode;
  infrastructureOwnership: InfrastructureOwnership;
  managedByDigvation: boolean;
  region?: string;
  applicationUrl?: string;
}

export type UpdateInstallationInput = Omit<CreateInstallationInput, 'clientProductId' | 'code'>;

export interface InstallationStatusTransitionInput {
  installationId: string;
  targetStatus: InstallationStatus;
  reason: string;
}
