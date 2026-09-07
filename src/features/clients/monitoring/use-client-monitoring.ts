import { useQuery } from '@tanstack/react-query';
import { resolveClientMonitoringDataSource } from './resolve-client-monitoring-data-source';

const source = resolveClientMonitoringDataSource();

export function useClientMonitoring(clientId: string) {
  return useQuery({ queryKey: ['clients', clientId, 'monitoring'], queryFn: () => source.getClientMonitoring(clientId), enabled: Boolean(clientId) });
}
