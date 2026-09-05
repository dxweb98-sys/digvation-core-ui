import { applicationConfig } from '../../../shared/config/application-config';
import { mockOverviewDataSource } from './mock-overview-data-source';
import type { OverviewDataSource } from './overview-data-source';

export function resolveOverviewDataSource(): OverviewDataSource {
  switch (applicationConfig.dataSourceMode) {
    case 'mock':
      return mockOverviewDataSource;
  }
}
