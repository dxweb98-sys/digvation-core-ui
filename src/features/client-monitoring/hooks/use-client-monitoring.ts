import { useQuery } from '@tanstack/react-query';
import { createMockClientMonitoringDataSource, CLIENT_A_CONTEXT } from '../data/mock-client-monitoring-data-source';
import type { ClientMonitoringContext } from '../types/client-monitoring';
const source = createMockClientMonitoringDataSource();
export function useClientMonitoring(context: ClientMonitoringContext = CLIENT_A_CONTEXT) { return useQuery({ queryKey: ['client-monitoring', context.clientId, context.permittedInstallationIds], queryFn: () => source.getMonitoring(context) }); }
