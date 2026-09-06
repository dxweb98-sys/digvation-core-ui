import { useQuery } from '@tanstack/react-query';
import { DASHBOARD_QUERY_KEYS } from '../data/dashboard-query-keys';
import { resolveDashboardDataSource } from '../data/resolve-dashboard-data-source';

const dashboardDataSource = resolveDashboardDataSource();

export function useDashboardOverview() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.overview,
    queryFn: () => dashboardDataSource.getOverview(),
  });
}
