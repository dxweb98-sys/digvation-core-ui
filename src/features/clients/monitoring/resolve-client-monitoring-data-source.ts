import type { ClientMonitoringDataSource } from './client-monitoring-data-source';
import { createMockClientMonitoringDataSource } from './mock-client-monitoring-data-source';

export function resolveClientMonitoringDataSource(): ClientMonitoringDataSource {
  return createMockClientMonitoringDataSource();
}
