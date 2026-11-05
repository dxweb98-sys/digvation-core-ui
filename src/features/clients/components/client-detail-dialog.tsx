import { ConnectedOnly } from '../../../shared/ui/not-connected';
import { AppAction } from '../../../shared/ui/app-action';
import { DCard, DCardContent, DConnectionError, DEmptyState, DTabs, DTabsContent, DTabsList, DTabsTrigger } from '@digvation/ui';
import { AppDialog, DetailItem, DetailList, DialogActions, DialogSection } from '../../../shared/ui/app-dialog';
import { useState } from 'react';
import { ClientProductsTab } from '../../client-products/components/client-products-tab';
import { ClientInstallationsTab } from '../../installations/components/client-installations-tab';
import { ClientCommercialTab } from '../../subscriptions/components/client-commercial-tab';
import { useClientDetail } from '../hooks/use-client-detail';
import { useClientStatusTransition } from '../hooks/use-client-mutations';
import type { ClientActivity, ClientStatus } from '../types/client';
import { ClientFormDialog } from './client-form-dialog';
import { ClientLifecycleAction } from './client-lifecycle-action';
import { ClientStatusBadge } from './client-status-badge';
import { ClientContactsSection } from './client-contacts-section';
import { ClientMonitoringTab } from './client-monitoring-tab';
import { ContentSkeleton } from '../../../shared/ui/content-skeleton';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ActivityTimeline({ activity }: { activity: ClientActivity[] }) {
  if (activity.length === 0) return <DEmptyState title="No activity" description="Status changes appear here." />;
  return <div className="client-activity-list">{activity.map((entry) => <article className="client-activity-item" key={entry.id}><time>{formatDate(entry.occurredAt)}</time><span aria-hidden="true" /><div><h3>{entry.title}</h3><p>{entry.description}</p></div></article>)}</div>;
}

export function ClientDetailDialog({
  clientId,
  open,
  onClose,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState('overview');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const clientQuery = useClientDetail(clientId);
  const statusTransition = useClientStatusTransition();

  if (clientQuery.isPending) {
    return <AppDialog kind="detail" open={open} onClose={onClose} title="Client details"><ContentSkeleton label="Loading client detail" /></AppDialog>;
  }

  if (clientQuery.isError) {
    return <AppDialog kind="detail" open={open} onClose={onClose} title="Client unavailable"><DConnectionError title="Client unavailable" message="Client information could not be loaded." detail={clientQuery.error.message} onRetry={() => void clientQuery.refetch()} /></AppDialog>;
  }

  if (!clientQuery.data) {
    return <AppDialog kind="detail" open={open} onClose={onClose} title="Client not found"><DEmptyState title="Client not found" description="The requested client record does not exist or is no longer available." /></AppDialog>;
  }

  const detail = clientQuery.data;
  const { client } = detail;

  async function handleTransition(targetStatus: ClientStatus, reason: string) {
    await statusTransition.mutateAsync({ clientId: client.id, targetStatus, reason });
  }

  return (
    <>
      <AppDialog kind="detail"
        open={open}
        onClose={onClose}
        title={client.displayName}
        status={<ClientStatusBadge status={client.status} />}
        identifier={client.code}
        meta={client.legalName}
        footer={
          <DialogActions
            destructive={<ClientLifecycleAction client={client} isSubmitting={statusTransition.isPending} onTransition={handleTransition} />}
            secondary={<AppAction tone="secondary" onClick={onClose}>Close</AppAction>}
            primary={<AppAction onClick={() => setIsEditDialogOpen(true)}>Edit</AppAction>}
          />
        }
      >
        <div className="client-detail-dialog">
          {statusTransition.isError ? <p className="client-form-error">{statusTransition.error.message}</p> : null}
          <DTabs defaultValue="overview" value={tab} onValueChange={setTab} className="client-detail-tabs">
            <DTabsList><DTabsTrigger value="overview">Overview</DTabsTrigger><DTabsTrigger value="products">Products</DTabsTrigger><DTabsTrigger value="commercial">Commercial</DTabsTrigger><DTabsTrigger value="installations">Installations</DTabsTrigger><DTabsTrigger value="monitoring">Monitoring</DTabsTrigger><DTabsTrigger value="activity">Activity</DTabsTrigger></DTabsList>
            <DTabsContent value="overview">
              <div><DialogSection title="Identity">
              <DetailList>
                <DetailItem label="Display name">{client.displayName}</DetailItem>
                <DetailItem label="Legal name">{client.legalName}</DetailItem>
                <DetailItem label="Client code"><code className="client-code">{client.code}</code></DetailItem>
                <DetailItem label="Status"><ClientStatusBadge status={client.status} /></DetailItem>
              </DetailList>
            </DialogSection>
            <DialogSection title="Contact">
              <DetailList>
                <DetailItem label="Organization email">{client.organizationEmail}</DetailItem>
                <DetailItem label="Organization phone">{client.organizationPhone}</DetailItem>
                <DetailItem label="Website">{client.website}</DetailItem>
              </DetailList>
            </DialogSection>
            <DialogSection title="Organization">
              <DetailList>
                <DetailItem label="Tax identifier">{client.taxIdentifier}</DetailItem>
                <DetailItem label="Country">{client.country}</DetailItem>
                <DetailItem label="Timezone">{client.timezone}</DetailItem>
                <DetailItem wide label="Address">{client.address}</DetailItem>
                <DetailItem wide label="Notes">{client.notes}</DetailItem>
              </DetailList>
            </DialogSection>
            <DialogSection title="Record">
              <DetailList>
                <DetailItem label="Status changed">{formatDate(client.statusChangedAt)}</DetailItem>
                <DetailItem label="Created">{formatDate(client.createdAt)}</DetailItem>
                <DetailItem label="Updated">{formatDate(client.updatedAt)}</DetailItem>
              </DetailList>
            </DialogSection><ConnectedOnly heading="Contacts" description="The people to contact at this client will appear here."><ClientContactsSection clientId={client.id} /></ConnectedOnly></div>
            </DTabsContent>
            <DTabsContent value="products"><ClientProductsTab clientId={client.id} canManageComposition={client.status === 'ACTIVE'} /></DTabsContent>
            <DTabsContent value="commercial"><ClientCommercialTab clientId={client.id} /></DTabsContent>
            <DTabsContent value="installations"><ClientInstallationsTab clientId={client.id} /></DTabsContent>
            <DTabsContent value="monitoring"><ConnectedOnly description="Health and incidents for this client's installations will appear here."><ClientMonitoringTab clientId={client.id} /></ConnectedOnly></DTabsContent>
            <DTabsContent value="activity"><ConnectedOnly description="Status changes for this client will appear here."><DCard variant="outlined"><DCardContent><ActivityTimeline activity={detail.activity} /></DCardContent></DCard></ConnectedOnly></DTabsContent>
          </DTabs>
        </div>
      </AppDialog>
      <ClientFormDialog open={isEditDialogOpen} mode="edit" client={client} onClose={() => setIsEditDialogOpen(false)} />
    </>
  );
}
