import type { ClientProductSummary } from '../../client-products/types/client-product';
import type { InstallationSummary } from '../../installations/types/installation';
import type { InstallationInfrastructureBinding } from '../../infrastructure/types/infrastructure';
import type { Deployment, Incident } from '../../operations/types/operations';
import type { HealthStatus, ObservedState, RuntimeServiceDetail } from '../../runtime/types/runtime';

export interface ClientMonitoringRecord {
  clientProduct: ClientProductSummary;
  installation: InstallationSummary;
  health: HealthStatus;
  runtimeStatus: ObservedState;
  runtimeServices: RuntimeServiceDetail[];
  currentDeployment?: Deployment;
  lastObservedAt?: string;
  activeIncidents: Incident[];
  maintenanceState?: 'MAINTENANCE' | 'ACTIVE' | 'NOT_APPLICABLE';
  infrastructureBindings: InstallationInfrastructureBinding[];
}

export interface ClientMonitoringOverview {
  productsMonitored: number;
  installations: number;
  systemsRequiringAttention: number;
  activeIncidents: number;
}

export interface ClientMonitoring {
  clientId: string;
  overview: ClientMonitoringOverview;
  records: ClientMonitoringRecord[];
}
