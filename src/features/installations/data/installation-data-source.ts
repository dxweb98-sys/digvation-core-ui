import type { ClientProductOption, CreateInstallationInput, Installation, InstallationListQuery, InstallationListResult, InstallationStatusTransitionInput, InstallationSummary, UpdateInstallationInput } from '../types/installation';

export interface InstallationDataSource {
  getInstallations(query: InstallationListQuery): Promise<InstallationListResult>;
  getInstallation(installationId: string): Promise<InstallationSummary | null>;
  getClientInstallations(clientId: string): Promise<InstallationSummary[]>;
  getClientProductOptions(): Promise<ClientProductOption[]>;
  createInstallation(input: CreateInstallationInput): Promise<InstallationSummary>;
  updateInstallation(installationId: string, input: UpdateInstallationInput): Promise<InstallationSummary>;
  transitionInstallationStatus(input: InstallationStatusTransitionInput): Promise<Installation>;
}
