import type { OverviewDataSource } from './overview-data-source';

export const mockOverviewDataSource: OverviewDataSource = {
  async getFoundation() {
    return {
      dataSourceLabel: 'Local mock data',
      capabilities: [
        {
          id: 'application-foundation',
          name: 'Application foundation',
          description: 'Providers, routing, shell, errors and loading are ready.',
          status: 'ready',
        },
        {
          id: 'core-integration',
          name: 'CORE integration',
          description: 'Control-plane APIs remain intentionally disconnected.',
          status: 'deferred',
        },
        {
          id: 'monitoring-integration',
          name: 'Monitoring integration',
          description: 'Runtime telemetry remains intentionally disconnected.',
          status: 'deferred',
        },
      ],
    };
  },
};
