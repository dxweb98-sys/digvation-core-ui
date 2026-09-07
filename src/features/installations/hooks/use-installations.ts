import { useQuery } from '@tanstack/react-query';
import { INSTALLATION_QUERY_KEYS } from '../data/installation-query-keys';
import { resolveInstallationDataSource } from '../data/resolve-installation-data-source';
import type { InstallationListQuery } from '../types/installation';

export const installationDataSource = resolveInstallationDataSource();
export function useInstallationList(query: InstallationListQuery) { return useQuery({ queryKey: INSTALLATION_QUERY_KEYS.list(query), queryFn: () => installationDataSource.getInstallations(query) }); }
export function useInstallationDetail(installationId: string) { return useQuery({ queryKey: INSTALLATION_QUERY_KEYS.detail(installationId), queryFn: () => installationDataSource.getInstallation(installationId), enabled: Boolean(installationId) }); }
export function useClientInstallations(clientId: string) { return useQuery({ queryKey: INSTALLATION_QUERY_KEYS.clientInstallations(clientId), queryFn: () => installationDataSource.getClientInstallations(clientId), enabled: Boolean(clientId) }); }
export function useClientProductOptions() { return useQuery({ queryKey: INSTALLATION_QUERY_KEYS.clientProductOptions, queryFn: () => installationDataSource.getClientProductOptions() }); }
