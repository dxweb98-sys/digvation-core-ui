import type { CreateInfrastructureNodeInput, CreateInstallationBindingInput, InfrastructureListQuery, InfrastructureListResult, InfrastructureNode, InfrastructureNodeDetail, InstallationInfrastructureBinding, InstallationOption, UpdateInfrastructureNodeInput } from '../types/infrastructure';
export interface InfrastructureDataSource {
  getInfrastructureNodes(query: InfrastructureListQuery): Promise<InfrastructureListResult>;
  getInfrastructureNode(nodeId: string): Promise<InfrastructureNodeDetail | null>;
  getInstallationBindings(installationId: string): Promise<InstallationInfrastructureBinding[]>;
  getInstallationOptions(): Promise<InstallationOption[]>;
  createInfrastructureNode(input: CreateInfrastructureNodeInput): Promise<InfrastructureNode>;
  updateInfrastructureNode(nodeId: string, input: UpdateInfrastructureNodeInput): Promise<InfrastructureNode>;
  bindInstallation(input: CreateInstallationBindingInput): Promise<InstallationInfrastructureBinding>;
  removeInstallationBinding(bindingId: string): Promise<void>;
}
