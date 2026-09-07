export type ClientHealth = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

export interface ClientMonitoringContext { clientId: string; displayName: string; permittedInstallationIds: string[]; }
export interface ClientSystem { id: string; productName: string; installationName: string; environment: string; applicationUrl?: string; health: ClientHealth; serviceSummary: string; lastObservedAt?: string; maintenance: boolean; version?: string; }
export interface ClientIncident { id: string; title: string; summary: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'; systemId: string; detectedAt: string; resolvedAt?: string; }
export interface ClientMonitoringProjection { context: ClientMonitoringContext; systems: ClientSystem[]; incidents: ClientIncident[]; }
