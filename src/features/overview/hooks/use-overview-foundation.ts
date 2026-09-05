import { useQuery } from '@tanstack/react-query';
import { resolveOverviewDataSource } from '../data/resolve-overview-data-source';

const overviewDataSource = resolveOverviewDataSource();

export function useOverviewFoundation() {
  return useQuery({
    queryKey: ['overview', 'foundation'],
    queryFn: () => overviewDataSource.getFoundation(),
  });
}
