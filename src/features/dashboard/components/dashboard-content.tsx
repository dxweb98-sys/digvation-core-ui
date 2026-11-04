import { useState } from 'react';
import type { DashboardOverview, DashboardTrendRange } from '../types/dashboard';
import { ActivityFeed } from './activity-feed';
import { ClientApplicationHealth } from './client-application-health';
import { DashboardNodeComparison, DashboardSnapshotCharts } from './dashboard-snapshot-charts';
import { DashboardSummary } from './dashboard-summary';
import { DashboardActivityTrends, DashboardHeroTrend } from './dashboard-trend-charts';
import { ManagedInfrastructure } from './managed-infrastructure';
import { RequiresAttention } from './requires-attention';

// Loaded lazily by the dashboard page, which keeps recharts out of the main chunk.
export default function DashboardContent({ dashboard }: { dashboard: DashboardOverview }) {
  const [range, setRange] = useState<DashboardTrendRange>('24h');
  const criticalAttentionCount = dashboard.attentionItems.filter(
    (item) => item.severity === 'CRITICAL',
  ).length;

  return (
    <div className="dashboard-bento">
      <RequiresAttention items={dashboard.attentionItems} />
      <DashboardSummary
        applications={dashboard.applicationHealth}
        criticalAttentionCount={criticalAttentionCount}
        estate={dashboard.trends?.estate}
        summary={dashboard.summary}
      />
      <h2 className="visually-hidden">Resource trend and recent activity</h2>
      <DashboardHeroTrend onRangeChange={setRange} range={range} trends={dashboard.trends} />
      <ActivityFeed deployments={dashboard.recentDeployments} events={dashboard.recentEvents} />
      <ManagedInfrastructure infrastructure={dashboard.infrastructure} />
      <h2 className="visually-hidden">Operational health</h2>
      <DashboardSnapshotCharts
        applications={dashboard.applicationHealth}
        deployments={dashboard.recentDeployments}
        events={dashboard.recentEvents}
      />
      <DashboardNodeComparison hasTrends={Boolean(dashboard.trends)} infrastructure={dashboard.infrastructure} />
      <DashboardActivityTrends range={range} trends={dashboard.trends} />
      <ClientApplicationHealth applications={dashboard.applicationHealth} />
    </div>
  );
}
