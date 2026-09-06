import { DCard, DCardContent, DDataTable, type TableColumn } from '@digvation-labs/ui';
import type { RecentDeployment } from '../types/dashboard';
import { DeploymentStatusBadge } from './dashboard-status-badges';

const DEPLOYMENT_COLUMNS: TableColumn<RecentDeployment>[] = [
  {
    key: 'clientName',
    label: 'Client / application',
    render: (deployment) => (
      <div className="table-primary-cell">
        <strong>{deployment.clientName}</strong>
        <span>{deployment.applicationName}</span>
      </div>
    ),
  },
  {
    key: 'serviceName',
    label: 'Service',
    render: (deployment) => deployment.serviceName ?? 'Application',
  },
  {
    key: 'version',
    label: 'Version',
    render: (deployment) => (
      <code className="version-label">{deployment.version}</code>
    ),
  },
  { key: 'environment', label: 'Environment' },
  {
    key: 'status',
    label: 'Status',
    render: (deployment) => (
      <DeploymentStatusBadge status={deployment.status} />
    ),
  },
  { key: 'deployedAtLabel', label: 'Deployed' },
];

export function RecentDeployments({
  deployments,
}: {
  deployments: RecentDeployment[];
}) {
  return (
    <section className="dashboard-section" aria-labelledby="deployments-title">
      <div className="dashboard-section-heading compact-heading">
        <div>
          <p className="section-eyebrow">Release activity</p>
          <h2 id="deployments-title">Recent deployments</h2>
        </div>
      </div>
      <DCard className="dashboard-table-card" variant="outlined">
        <DCardContent>
          <DDataTable
            columns={DEPLOYMENT_COLUMNS}
            data={deployments}
            rowKey="id"
            emptyMessage="No recent deployments are available."
          />
        </DCardContent>
      </DCard>
    </section>
  );
}
