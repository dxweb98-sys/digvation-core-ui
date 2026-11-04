import { DButton, DDataTable, DEmptyState, DTabs, DTabsContent, DTabsList, DTabsTrigger, type TableColumn } from '@digvation/ui';
import { AppDialog, DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import { Badge } from '../../operations/components/operations-badges';
import { HealthBadge, ObservedStateBadge } from '../../runtime/components/runtime-status-badge';
import type { ClientMonitoringRecord } from '../monitoring/client-monitoring';

function formatDate(value?: string) { return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : null; }

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
  { key: 'ownership', label: 'Ownership', render: (binding) => binding.node?.ownership  },
  { key: 'lifecycle', label: 'Maintenance state', render: (binding) => binding.node?.lifecycleStatus  },
];

export function ClientSystemDetailDialog({ record, open, onClose }: { record: ClientMonitoringRecord; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState('overview');
  const dedicated = record.installation.deploymentMode === 'DEDICATED';
  return <AppDialog kind="detail" open={open} onClose={onClose} title={record.installation.name} status={<HealthBadge status={record.health} />} meta={`${record.clientProduct.productName}, ${record.installation.environment}`} footer={<div className="client-dialog-actions"><DButton variant="outline" onClick={onClose}>Close</DButton></div>}>
    <DTabs defaultValue="overview" value={tab} onValueChange={setTab} className="client-detail-tabs">
      <DTabsList><DTabsTrigger value="overview">Overview</DTabsTrigger><DTabsTrigger value="runtime">Runtime</DTabsTrigger><DTabsTrigger value="incidents">Incidents</DTabsTrigger><DTabsTrigger value="deployment">Deployment</DTabsTrigger>{dedicated ? <DTabsTrigger value="infrastructure">Infrastructure</DTabsTrigger> : null}</DTabsList>
      <DTabsContent value="overview"><DetailList><DetailItem label="Product">{record.clientProduct.productName}</DetailItem><DetailItem label="Installation">{record.installation.name}</DetailItem><DetailItem label="Environment">{record.installation.environment}</DetailItem><DetailItem label="Deployment mode">{record.installation.deploymentMode}</DetailItem><DetailItem label="Health"><HealthBadge status={record.health} /></DetailItem><DetailItem label="Maintenance">{record.maintenanceState === 'NOT_APPLICABLE' ? 'Not applicable for shared deployment' : record.maintenanceState}</DetailItem><DetailItem label="Current version">{record.currentDeployment?.version ?? 'Not deployed'}</DetailItem><DetailItem label="Last observed">{formatDate(record.lastObservedAt)}</DetailItem><DetailItem label="Runtime status"><ObservedStateBadge state={record.runtimeStatus} /></DetailItem><DetailItem label="Active incidents">{record.activeIncidents.length}</DetailItem>{dedicated ? <DetailItem label="Bound infrastructure">{record.infrastructureBindings.length}</DetailItem> : null}</DetailList></DTabsContent>
      <DTabsContent value="runtime">{record.runtimeServices.length ? <DDataTable columns={runtimeColumns} data={record.runtimeServices} rowKey="id" /> : <DEmptyState title="No runtime services" description="No runtime service is registered for this installation." />}</DTabsContent>
      <DTabsContent value="incidents">{record.activeIncidents.length ? <DDataTable columns={incidentColumns} data={record.activeIncidents} rowKey="id" /> : <DEmptyState title="No active incidents" description="No open or acknowledged incidents affect this installation." />}</DTabsContent>
      <DTabsContent value="deployment">{record.currentDeployment ? <DetailList><DetailItem label="Current safe version">{record.currentDeployment.version}</DetailItem><DetailItem label="Status"><Badge value={record.currentDeployment.status} /></DetailItem><DetailItem label="Completed">{formatDate(record.currentDeployment.completedAt)}</DetailItem><DetailItem label="Release reference">{record.currentDeployment.releaseReference}</DetailItem></DetailList> : <DEmptyState title="No successful deployment" description="A safe current version is shown after a successful deployment is recorded." />}</DTabsContent>
      {dedicated ? <DTabsContent value="infrastructure">{record.infrastructureBindings.length ? <DDataTable columns={infrastructureColumns} data={record.infrastructureBindings} rowKey="id" /> : <DEmptyState title="No infrastructure bindings" description="No infrastructure resource is bound to this dedicated installation." />}</DTabsContent> : null}
    </DTabs>
  </AppDialog>;
}
