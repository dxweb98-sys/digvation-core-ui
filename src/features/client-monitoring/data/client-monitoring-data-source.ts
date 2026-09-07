import type { ClientMonitoringContext, ClientMonitoringProjection } from '../types/client-monitoring';

export interface ClientMonitoringDataSource { getMonitoring(context: ClientMonitoringContext): Promise<ClientMonitoringProjection>; }
