import { applicationConfig } from '../../../shared/config/application-config';
import type { DashboardDataSource } from './dashboard-data-source';
import { createMockDashboardDataSource } from './mock-dashboard-data-source';

export function resolveDashboardDataSource(): DashboardDataSource {
  switch (applicationConfig.dataSourceMode) {
    case 'mock':
      return createMockDashboardDataSource(applicationConfig.mockDashboardState);
  }
}
