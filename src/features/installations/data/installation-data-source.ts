import type {
  ClientOption,
  ClientProductOption,
  CreateInstallationInput,
  Installation,
  InstallationListQuery,
  InstallationListResult,
  InstallationStatusTransitionInput,
  InstallationSummary,
  ReplaceInstallationProductsInput,
  UpdateInstallationBrandingInput,
  UpdateInstallationInput,
} from '../types/installation';

export interface InstallationDataSource {
  getInstallations(query: InstallationListQuery): Promise<InstallationListResult>;
  getInstallation(installationId: string): Promise<InstallationSummary | null>;
  getClientInstallations(clientId: string): Promise<InstallationSummary[]>;
  getClientOptions(): Promise<ClientOption[]>;
  getClientProductOptions(clientId: string): Promise<ClientProductOption[]>;
  createInstallation(input: CreateInstallationInput): Promise<InstallationSummary>;
  updateInstallation(
    installationId: string,
    input: UpdateInstallationInput,
  ): Promise<InstallationSummary>;
  replaceInstallationProducts(
    input: ReplaceInstallationProductsInput,
  ): Promise<InstallationSummary>;
  updateInstallationBranding(
    input: UpdateInstallationBrandingInput,
  ): Promise<InstallationSummary>;
  transitionInstallationStatus(
    input: InstallationStatusTransitionInput,
  ): Promise<Installation>;
}
