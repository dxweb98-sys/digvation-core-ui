export type InfrastructureOwnership = 'DIGVATION' | 'CLIENT';
export type InfrastructureLifecycleStatus = 'REGISTERED' | 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
export type InstallationInfrastructureRole = 'APPLICATION' | 'DATABASE' | 'CACHE' | 'STORAGE' | 'REVERSE_PROXY';

export interface InfrastructureNode {
  id: string; code: string; name: string; provider: string; region?: string; ownership: InfrastructureOwnership; managedByDigvation: boolean; lifecycleStatus: InfrastructureLifecycleStatus; hostname?: string; publicAddress?: string; privateAddress?: string; operatingSystem?: string; architecture?: string; cpuCores?: number; memoryMiB?: number; diskGiB?: number; notes?: string; createdAt: string; updatedAt: string;
}
export interface InstallationOption { id: string; label: string; clientName: string; productName: string; environment: string; }
export interface InstallationInfrastructureBinding { id: string; installationId: string; infrastructureNodeId: string; role: InstallationInfrastructureRole; createdAt: string; installation?: InstallationOption; node?: InfrastructureNode; }
export interface InfrastructureNodeDetail extends InfrastructureNode { bindings: InstallationInfrastructureBinding[]; }
export interface InfrastructureListQuery { search: string; ownership: InfrastructureOwnership | 'ALL'; lifecycleStatus: InfrastructureLifecycleStatus | 'ALL'; page: number; limit: number; }
export interface InfrastructureListResult { nodes: InfrastructureNode[]; total: number; totalPages: number; }
export type CreateInfrastructureNodeInput = Omit<InfrastructureNode, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInfrastructureNodeInput = Omit<CreateInfrastructureNodeInput, 'code'>;
export interface CreateInstallationBindingInput { installationId: string; infrastructureNodeId: string; role: InstallationInfrastructureRole; }
