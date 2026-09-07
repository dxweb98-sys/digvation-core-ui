import { DButton, DDataTable, DDialog, DEmptyState, DTabs, DTabsContent, DTabsList, DTabsTrigger, type TableColumn } from '@digvation/ui';
import { useState } from 'react';
import { Badge } from '../../operations/components/operations-badges';
import { HealthBadge, ObservedStateBadge } from '../../runtime/components/runtime-status-badge';
import type { ClientMonitoringRecord } from '../monitoring/client-monitoring';

function formatDate(value?: string) { return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not observed'; }

const runtimeColumns: TableColumn<ClientMonitoringRecord['runtimeServices'][number]>[] = [
  { key: 'name', label: 'Service', render: (service) => <div className="client-monitoring-identity"><strong>{service.name}</strong><code>{service.code}</code></div> },
  { key: 'healthStatus', label: 'Health', render: (service) => <HealthBadge status={service.healthStatus} /> },
  { key: 'instances', label: 'Instances', render: (service) => service.instances.length },
  { key: 'observed', label: 'Observed state', render: (service) => service.instances.length ? <ObservedStateBadge state={service.instances.some((instance) => instance.observedState === 'FAILED') ? 'FAILED' : service.instances[0].observedState} /> : 'Unknown' },
  { key: 'lastObserved', label: 'Last observed', render: (service) => formatDate(service.instances.map((instance) => instance.lastObservedAt).filter(Boolean).sort().at(-1)) },
];
const incidentColumns: TableColumn<ClientMonitoringRecord['activeIncidents'][number]>[] = [
  { key: 'title', label: 'Incident', render: (incident) => <div className="client-monitoring-identity"><strong>{incident.title}</strong><code>{incident.code}</code></div> },
  { key: 'severity', label: 'Severity', render: (incident) => <Badge value={incident.severity} /> },
  { key: 'status', label: 'Status', render: (incident) => <Badge value={incident.status} /> },
  { key: 'detectedAt', label: 'Detected', render: (incident) => formatDate(incident.detectedAt) },
];
const infrastructureColumns: TableColumn<ClientMonitoringRecord['infrastructureBindings'][number]>[] = [
  { key: 'node', label: 'Infrastructure', render: (binding) => <div className="client-monitoring-identity"><strong>{binding.node?.name ?? 'Unavailable node'}</strong><code>{binding.node?.code}</code></div> },
  { key: 'role', label: 'Role', render: (binding) => binding.role.replace('_', ' ') },
  { key: 'ownership', label: 'Ownership', render: (binding) => binding.node?.ownership ?? 'Not recorded' },
  { key: 'lifecycle', label: 'Maintenance state', render: (binding) => binding.node?.lifecycleStatus ?? 'Not recorded' },
];

export function ClientSystemDetailDialog({ record, open, onClose }: { record: ClientMonitoringRecord; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState('overview');
  const dedicated = record.installation.deploymentMode === 'DEDICATED';
  return <DDialog open={open} onClose={onClose} size="xl" title={record.installation.name} description={`${record.clientProduct.productName} · ${record.installation.environment}`} footer={<div className="client-dialog-actions"><DButton variant="outline" onClick={onClose}>Close</DButton></div>}>
    <DTabs defaultValue="overview" value={tab} onValueChange={setTab} className="client-detail-tabs">
      <DTabsList><DTabsTrigger value="overview">Overview</DTabsTrigger><DTabsTrigger value="runtime">Runtime</DTabsTrigger><DTabsTrigger value="incidents">Incidents</DTabsTrigger><DTabsTrigger value="deployment">Deployment</DTabsTrigger>{dedicated ? <DTabsTrigger value="infrastructure">Infrastructure</DTabsTrigger> : null}</DTabsList>
      <DTabsContent value="overview"><dl className="client-monitoring-detail-list"><div><dt>Health</dt><dd><HealthBadge status={record.health} /></dd></div><div><dt>Runtime status</dt><dd><ObservedStateBadge state={record.runtimeStatus} /></dd></div><div><dt>Deployment mode</dt><dd>{record.installation.deploymentMode}</dd></div><div><dt>Last observed</dt><dd>{formatDate(record.lastObservedAt)}</dd></div><div><dt>Active incidents</dt><dd>{record.activeIncidents.length}</dd></div><div><dt>Maintenance</dt><dd>{record.maintenanceState === 'NOT_APPLICABLE' ? 'Not applicable for shared deployment' : record.maintenanceState}</dd></div>{dedicated ? <div><dt>Bound infrastructure</dt><dd>{record.infrastructureBindings.length}</dd></div> : null}</dl></DTabsContent>
      <DTabsContent value="runtime">{record.runtimeServices.length ? <DDataTable columns={runtimeColumns} data={record.runtimeServices} rowKey="id" /> : <DEmptyState title="No runtime services" description="No runtime service is registered for this installation." />}</DTabsContent>
      <DTabsContent value="incidents">{record.activeIncidents.length ? <DDataTable columns={incidentColumns} data={record.activeIncidents} rowKey="id" /> : <DEmptyState title="No active incidents" description="No open or acknowledged incidents affect this installation." />}</DTabsContent>
      <DTabsContent value="deployment">{record.currentDeployment ? <dl className="client-monitoring-detail-list"><div><dt>Current safe version</dt><dd>{record.currentDeployment.version}</dd></div><div><dt>Status</dt><dd><Badge value={record.currentDeployment.status} /></dd></div><div><dt>Completed</dt><dd>{formatDate(record.currentDeployment.completedAt)}</dd></div><div><dt>Release reference</dt><dd>{record.currentDeployment.releaseReference ?? 'Not recorded'}</dd></div></dl> : <DEmptyState title="No successful deployment" description="A safe current version is shown after a successful deployment is recorded." />}</DTabsContent>
      {dedicated ? <DTabsContent value="infrastructure">{record.infrastructureBindings.length ? <DDataTable columns={infrastructureColumns} data={record.infrastructureBindings} rowKey="id" /> : <DEmptyState title="No infrastructure bindings" description="No infrastructure resource is bound to this dedicated installation." />}</DTabsContent> : null}
    </DTabs>
  </DDialog>;
}
