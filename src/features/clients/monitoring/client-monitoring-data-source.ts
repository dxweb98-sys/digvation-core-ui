import type { ClientMonitoring } from './client-monitoring';

export interface ClientMonitoringDataSource {
  getClientMonitoring(clientId: string): Promise<ClientMonitoring>;
}
