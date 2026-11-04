import { DConnectionError, DEmptyState } from '@digvation/ui';
import { lazy, Suspense } from 'react';
import { DashboardLoadingState } from '../components/dashboard-loading-state';
import { useDashboardOverview } from '../hooks/use-dashboard-overview';
import '../dashboard.css';

const DashboardContent = lazy(() => import('../components/dashboard-content'));

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

      <Suspense fallback={<DashboardLoadingState />}>
        <DashboardContent dashboard={dashboard} />
      </Suspense>
    </div>
  );
}
