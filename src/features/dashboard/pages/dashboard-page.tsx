import { DConnectionError, DEmptyState } from '@digvation-labs/ui';
import { ClientApplicationHealth } from '../components/client-application-health';
import { DashboardLoadingState } from '../components/dashboard-loading-state';
import { DashboardSummary } from '../components/dashboard-summary';
import { ManagedInfrastructure } from '../components/managed-infrastructure';
import { OperationalHealthSummary } from '../components/operational-health-summary';
import { RecentDeployments } from '../components/recent-deployments';
import { RecentEvents } from '../components/recent-events';
import { RequiresAttention } from '../components/requires-attention';
import { useDashboardOverview } from '../hooks/use-dashboard-overview';
import '../dashboard.css';

export function DashboardPage() {
  const dashboardQuery = useDashboardOverview();

  if (dashboardQuery.isPending) {
    return <DashboardLoadingState />;
  }

  if (dashboardQuery.isError) {
    return (
      <div className="dashboard-page-state">
        <DConnectionError
          title="Operational dashboard unavailable"
          message="Dashboard data could not be loaded from the selected data source."
          detail={dashboardQuery.error.message}
          isRetrying={dashboardQuery.isFetching}
          onRetry={() => void dashboardQuery.refetch()}
        />
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const criticalAttentionCount = dashboard.attentionItems.filter(
    (item) => item.severity === 'CRITICAL',
  ).length;
  const isDashboardEmpty =
    dashboard.summary.clientCount === 0 &&
    dashboard.applicationHealth.length === 0 &&
    dashboard.infrastructure.length === 0;

  if (isDashboardEmpty) {
    return (
      <div className="dashboard-page-state">
        <DEmptyState
          title="No operational estate configured"
          description="Dashboard information will appear when client installations are registered."
        />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <p className="page-eyebrow">Operations overview</p>
          <h1>Dashboard</h1>
          <p>
            Current service health, operational risks, infrastructure pressure,
            and recent changes across Digvation-managed client applications.
          </p>
        </div>
        <span className="dashboard-updated">{dashboard.generatedAtLabel}</span>
      </div>

      <DashboardSummary
        summary={dashboard.summary}
        criticalAttentionCount={criticalAttentionCount}
      />
      <OperationalHealthSummary applications={dashboard.applicationHealth} />
      <RequiresAttention items={dashboard.attentionItems} />
      <ClientApplicationHealth applications={dashboard.applicationHealth} />
      <ManagedInfrastructure infrastructure={dashboard.infrastructure} />
      <RecentDeployments deployments={dashboard.recentDeployments} />
      <RecentEvents events={dashboard.recentEvents} />
    </div>
  );
}
