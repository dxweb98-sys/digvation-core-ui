import { DCard, DCardContent, DDataTable, type TableColumn } from '@digvation-labs/ui';
import type { ClientApplicationHealth as ClientApplicationHealthData } from '../types/dashboard';
import { OperationalHealthBadge } from './dashboard-status-badges';

const APPLICATION_HEALTH_COLUMNS: TableColumn<ClientApplicationHealthData>[] = [
  {
    key: 'clientName',
    label: 'Client / application',
    render: (application) => (
      <div className="table-primary-cell">
        <strong>{application.clientName}</strong>
        <span>{application.applicationName}</span>
      </div>
    ),
  },
  { key: 'environment', label: 'Environment' },
  {
    key: 'status',
    label: 'Status',
    render: (application) => (
      <OperationalHealthBadge status={application.status} />
    ),
  },
  {
    key: 'runningVersion',
    label: 'Running version',
    render: (application) => (
      <code className="version-label">{application.runningVersion}</code>
    ),
  },
  {
    key: 'lastDeploymentLabel',
    label: 'Last deployment',
    render: (application) => application.lastDeploymentLabel ?? 'Not recorded',
  },
];

export function ClientApplicationHealth({
  applications,
}: {
  applications: ClientApplicationHealthData[];
}) {
  return (
    <section className="dashboard-section" aria-labelledby="application-health-title">
      <div className="dashboard-section-heading compact-heading">
        <div>
          <p className="section-eyebrow">Live estate</p>
          <h2 id="application-health-title">Client application health</h2>
        </div>
        <span className="section-count">{applications.length} installations</span>
      </div>
      <DCard className="dashboard-table-card" variant="outlined">
        <DCardContent>
          <DDataTable
            columns={APPLICATION_HEALTH_COLUMNS}
            data={applications}
            rowKey="id"
            emptyMessage="No client applications are registered."
          />
        </DCardContent>
      </DCard>
    </section>
  );
}
