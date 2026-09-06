import type { DashboardOverview } from '../types/dashboard';

export interface DashboardDataSource {
  getOverview(): Promise<DashboardOverview>;
}
