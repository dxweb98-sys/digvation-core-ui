import { useQuery } from '@tanstack/react-query';
import { INFRASTRUCTURE_QUERY_KEYS } from '../data/infrastructure-query-keys';
import { resolveInfrastructureDataSource } from '../data/resolve-infrastructure-data-source';
import type { InfrastructureListQuery } from '../types/infrastructure';
export const infrastructureDataSource = resolveInfrastructureDataSource();
export function useInfrastructureList(query: InfrastructureListQuery) { return useQuery({ queryKey: INFRASTRUCTURE_QUERY_KEYS.list(query), queryFn: () => infrastructureDataSource.getInfrastructureNodes(query) }); }
export function useInfrastructureDetail(nodeId: string) { return useQuery({ queryKey: INFRASTRUCTURE_QUERY_KEYS.detail(nodeId), queryFn: () => infrastructureDataSource.getInfrastructureNode(nodeId), enabled: Boolean(nodeId) }); }
export function useInstallationInfrastructure(installationId: string) { return useQuery({ queryKey: INFRASTRUCTURE_QUERY_KEYS.installationBindings(installationId), queryFn: () => infrastructureDataSource.getInstallationBindings(installationId), enabled: Boolean(installationId) }); }
export function useInfrastructureInstallationOptions() { return useQuery({ queryKey: INFRASTRUCTURE_QUERY_KEYS.installationOptions, queryFn: () => infrastructureDataSource.getInstallationOptions() }); }
