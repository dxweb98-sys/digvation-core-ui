export type OperationalHealth =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'CRITICAL'
  | 'UNKNOWN'
  | 'MAINTENANCE';

export type AttentionSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type DeploymentStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILED';

export type OperationalEventType =
  | 'CONTAINER_RESTARTED'
  | 'OUT_OF_MEMORY_KILLED'
  | 'ALERT_TRIGGERED'
  | 'DEPLOYMENT_COMPLETED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_RESOLVED';

export interface DashboardSummary {
  clientCount: number;
  managedInstallationCount: number;
  healthyInstallationCount: number;
  openIncidentCount: number;
}

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  clientName: string;
  applicationName: string;
  installationName: string;
  environment: string;
  problem: string;
  probableCause?: string;
  evidence: string[];
  durationLabel: string;
}

export interface ClientApplicationHealth {
  id: string;
  clientName: string;
  applicationName: string;
  environment: string;
  status: OperationalHealth;
  runningVersion: string;
  lastDeploymentLabel?: string;
}

export interface InfrastructureSummary {
  id: string;
  nodeName: string;
  region: string;
  status: OperationalHealth;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  installationCount: number;
}

export interface RecentDeployment {
  id: string;
  clientName: string;
  applicationName: string;
  serviceName?: string;
  version: string;
  environment: string;
  status: DeploymentStatus;
  deployedAtLabel: string;
}

export interface OperationalEvent {
  id: string;
  type: OperationalEventType;
  title: string;
  description: string;
  occurredAtLabel: string;
  clientName?: string;
  applicationName?: string;
  severity: AttentionSeverity;
}

export interface DashboardOverview {
  generatedAtLabel: string;
  summary: DashboardSummary;
  attentionItems: AttentionItem[];
  applicationHealth: ClientApplicationHealth[];
  infrastructure: InfrastructureSummary[];
  recentDeployments: RecentDeployment[];
  recentEvents: OperationalEvent[];
}
