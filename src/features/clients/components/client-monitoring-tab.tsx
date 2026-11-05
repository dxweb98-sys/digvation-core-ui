import { RecordButton } from '../../../shared/ui/record-button';
import { labelFor } from '../../../shared/labels/labels';
import { DConnectionError, DDataTable, DEmptyState, type TableAction, type TableColumn } from '@digvation/ui';
import { useState } from 'react';
import { ContentSkeleton } from '../../../shared/ui/content-skeleton';
import { Badge } from '../../operations/components/operations-badges';
import { HealthBadge, ObservedStateBadge } from '../../runtime/components/runtime-status-badge';
import type { ClientMonitoringRecord } from '../monitoring/client-monitoring';
import { useClientMonitoring } from '../monitoring/use-client-monitoring';
import { ClientSystemDetailDialog } from './client-system-detail-dialog';

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not observed';
}

const columns: TableColumn<ClientMonitoringRecord>[] = [
  { key: 'system', label: 'System', render: (record) => <div className="client-monitoring-identity"><RecordButton><strong>{record.installation.name}</strong></RecordButton><span>{record.clientProduct.productName}</span></div> },
  { key: 'environment', label: 'Environment', render: (record) => labelFor(record.installation.environment) },
  { key: 'deploymentMode', label: 'Deployment', render: (record) => labelFor(record.installation.deploymentMode) },
  { key: 'health', label: 'Health', render: (record) => <HealthBadge status={record.health} /> },
  { key: 'runtimeStatus', label: 'Runtime', render: (record) => <ObservedStateBadge state={record.runtimeStatus} /> },
  { key: 'incidents', label: 'Incident', render: (record) => record.activeIncidents.length ? <div className="client-monitoring-incident"><Badge value={record.activeIncidents[0].severity} /><Badge value={record.activeIncidents[0].status} />{record.maintenanceState === 'MAINTENANCE' ? <span>Maintenance</span> : null}</div> : record.maintenanceState === 'MAINTENANCE' ? <div className="client-monitoring-incident"><span>None</span><span>Maintenance</span></div> : 'None' },
  { key: 'lastObservedAt', label: 'Updated', render: (record) => formatDate(record.lastObservedAt) },
];

export function ClientMonitoringTab({ clientId }: { clientId: string }) {
  const [record, setRecord] = useState<ClientMonitoringRecord | null>(null);
  const query = useClientMonitoring(clientId);
  if (query.isPending) return <ContentSkeleton label="Loading client operational monitoring" rows={4} />;
  if (query.isError) return <DConnectionError title="Monitoring unavailable" message="Client operational information could not be loaded." detail={query.error.message} onRetry={() => void query.refetch()} />;
  const actions: TableAction<ClientMonitoringRecord>[] = [{ label: 'View', onClick: setRecord }];
  return <div className="client-monitoring-tab">
    <dl className="client-monitoring-summary" aria-label="Operational summary">
      <div><dt>Products monitored</dt><dd>{query.data.overview.productsMonitored}</dd></div>
      <div><dt>Installations</dt><dd>{query.data.overview.installations}</dd></div>
      <div><dt>Requires attention</dt><dd>{query.data.overview.systemsRequiringAttention}</dd></div>
      <div><dt>Active incidents</dt><dd>{query.data.overview.activeIncidents}</dd></div>
    </dl>
    {query.data.records.length ? <DDataTable columns={columns} data={query.data.records} rowKey={(record) => record.installation.id} onRowClick={setRecord} actions={actions} /> : <DEmptyState title="No monitored installations" description="Install a product for this client to see monitoring." />}
    {record ? <ClientSystemDetailDialog record={record} open onClose={() => setRecord(null)} /> : null}
  </div>;
}
