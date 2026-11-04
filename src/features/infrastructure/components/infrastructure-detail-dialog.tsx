import { DButton, DConfirmDialog, DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, DTabs, DTabsContent, DTabsList, DTabsTrigger, useToast, type TableAction, type TableColumn } from '@digvation/ui';
import { AppDialog, DetailItem, DetailList, DialogActions, DialogSection } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import { useInfrastructureDetail } from '../hooks/use-infrastructure';
import { useRemoveInstallationBinding } from '../hooks/use-infrastructure-mutations';
import type { InstallationInfrastructureBinding } from '../types/infrastructure';
import { InfrastructureFormDialog } from './infrastructure-form-dialog';
import { InfrastructureStatusBadge } from './infrastructure-status-badge';
import { InstallationBindingDialog } from './installation-binding-dialog';
function formatDate(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
const BINDING_COLUMNS: TableColumn<InstallationInfrastructureBinding>[] = [{ key: 'installation', label: 'Installation', render: (binding) => <div className="infrastructure-identity"><strong>{binding.installation?.label}</strong><code>{binding.installation?.clientName} · {binding.installation?.productName}</code></div> }, { key: 'environment', label: 'Environment', render: (binding) => binding.installation?.environment ?? 'Not recorded' }, { key: 'role', label: 'Role', render: (binding) => binding.role.replace('_', ' ') }, { key: 'createdAt', label: 'Bound', render: (binding) => formatDate(binding.createdAt) }];
export function InfrastructureDetailDialog({ nodeId, open, onClose }: { nodeId: string; open: boolean; onClose: () => void }) { const [tab, setTab] = useState('overview'); const [edit, setEdit] = useState(false); const [bind, setBind] = useState(false); const [remove, setRemove] = useState<InstallationInfrastructureBinding | null>(null); const query = useInfrastructureDetail(nodeId); const mutation = useRemoveInstallationBinding(); const { showToast } = useToast(); if (query.isPending) return <AppDialog kind="detail" open={open} onClose={onClose} title="Infrastructure details"><div className="infrastructure-state"><DLoadingIndicator label="Loading infrastructure detail" /></div></AppDialog>; if (query.isError) return <AppDialog kind="detail" open={open} onClose={onClose} title="Infrastructure unavailable"><DConnectionError title="Infrastructure unavailable" message="Infrastructure information could not be loaded." detail={query.error.message} onRetry={() => void query.refetch()} /></AppDialog>; if (!query.data) return <AppDialog kind="detail" open={open} onClose={onClose} title="Infrastructure not found"><DEmptyState title="Infrastructure not found" description="The requested infrastructure resource does not exist." /></AppDialog>; const node = query.data; const actions: TableAction<InstallationInfrastructureBinding>[] = [{ label: 'Remove binding', onClick: setRemove }]; async function removeBinding() { if (!remove) return; try { await mutation.mutateAsync(remove.id); showToast({ title: 'Binding removed', description: 'The installation is no longer bound to this node.', variant: 'success' }); setRemove(null); } catch (error) { showToast({ title: 'Remove binding failed', description: error instanceof Error ? error.message : 'The binding could not be removed.', variant: 'danger' }); } }
  return <><AppDialog kind="detail" open={open} onClose={onClose} title={node.name} status={<InfrastructureStatusBadge status={node.lifecycleStatus} />} identifier={node.code} meta={node.region} footer={<DialogActions secondary={<DButton variant="outline" onClick={onClose}>Close</DButton>} primary={<DButton onClick={() => setEdit(true)}>Edit Infrastructure</DButton>} />}><div className="infrastructure-detail"><DTabs className="infrastructure-detail-tabs" defaultValue="overview" value={tab} onValueChange={setTab}><DTabsList><DTabsTrigger value="overview">Overview</DTabsTrigger><DTabsTrigger value="installations">Installations</DTabsTrigger></DTabsList><DTabsContent value="overview"><div><DialogSection title="Resource">
  <DetailList>
    <DetailItem label="Provider">{node.provider}</DetailItem>
    <DetailItem label="Region">{node.region}</DetailItem>
    <DetailItem label="Ownership">{node.ownership}</DetailItem>
    <DetailItem label="Managed by Digvation">{node.managedByDigvation ? 'Yes' : 'No'}</DetailItem>
    <DetailItem label="Lifecycle"><InfrastructureStatusBadge status={node.lifecycleStatus} /></DetailItem>
    <DetailItem wide label="Notes">{node.notes}</DetailItem>
  </DetailList>
</DialogSection>
<DialogSection title="Network">
  <DetailList>
    <DetailItem label="Hostname">{node.hostname}</DetailItem>
    <DetailItem label="Public address">{node.publicAddress}</DetailItem>
    <DetailItem label="Private address">{node.privateAddress}</DetailItem>
  </DetailList>
</DialogSection>
<DialogSection title="Capacity">
  <DetailList>
    <DetailItem label="Operating system">{node.operatingSystem}</DetailItem>
    <DetailItem label="Architecture">{node.architecture}</DetailItem>
    <DetailItem label="CPU cores">{node.cpuCores}</DetailItem>
    <DetailItem label="Total memory">{node.memoryMiB ? `${node.memoryMiB} MiB` : null}</DetailItem>
    <DetailItem label="Total disk">{node.diskGiB ? `${node.diskGiB} GiB` : null}</DetailItem>
  </DetailList>
</DialogSection>
<DialogSection title="Record">
  <DetailList>
    <DetailItem label="Created">{formatDate(node.createdAt)}</DetailItem>
    <DetailItem label="Updated">{formatDate(node.updatedAt)}</DetailItem>
  </DetailList>
</DialogSection></div></DTabsContent><DTabsContent value="installations"><div className="infrastructure-bindings"><div className="infrastructure-tab-actions"><DButton onClick={() => setBind(true)}>Bind Installation</DButton></div>{node.bindings.length === 0 ? <DEmptyState title="No installation bindings" description="Bind an installation to record the role this infrastructure resource serves." /> : <DDataTable columns={BINDING_COLUMNS} data={node.bindings} rowKey="id" actions={actions} />}</div></DTabsContent></DTabs></div></AppDialog><InfrastructureFormDialog open={edit} mode="edit" node={node} onClose={() => setEdit(false)} /><InstallationBindingDialog open={bind} nodeId={node.id} onClose={() => setBind(false)} /><DConfirmDialog open={remove !== null} onClose={() => setRemove(null)} title="Remove infrastructure binding" message={remove ? `Remove the ${remove.role.replace('_', ' ').toLowerCase()} binding for ${remove.installation?.label ?? 'this installation'}?` : ''} confirmLabel="Remove Binding" variant="danger" loading={mutation.isPending} onConfirm={() => void removeBinding()} /></>; }
