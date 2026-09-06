import { DButton, DCard, DCardContent, DConnectionError, DDialog, DEmptyState, DLoadingIndicator, DTabs, DTabsContent, DTabsList, DTabsTrigger } from '@digvation-labs/ui';
import { useState } from 'react';
import { ClientProductsTab } from '../../client-products/components/client-products-tab';
import { useClientDetail } from '../hooks/use-client-detail';
import { useClientStatusTransition } from '../hooks/use-client-mutations';
import type { ClientActivity, ClientStatus } from '../types/client';
import { ClientFormDialog } from './client-form-dialog';
import { ClientLifecycleAction } from './client-lifecycle-action';
import { ClientStatusBadge } from './client-status-badge';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ActivityTimeline({ activity }: { activity: ClientActivity[] }) {
  if (activity.length === 0) return <DEmptyState title="No client activity" description="Administrative lifecycle activity will appear here." />;
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
    return <DDialog open={open} onClose={onClose} title="Client details" size="xl"><div className="client-dialog-state"><DLoadingIndicator label="Loading client detail" /></div></DDialog>;
  }

  if (clientQuery.isError) {
    return <DDialog open={open} onClose={onClose} title="Client unavailable" size="xl"><DConnectionError title="Client unavailable" message="Client information could not be loaded." detail={clientQuery.error.message} onRetry={() => void clientQuery.refetch()} /></DDialog>;
  }

  if (!clientQuery.data) {
    return <DDialog open={open} onClose={onClose} title="Client not found" size="xl"><DEmptyState title="Client not found" description="The requested client record does not exist or is no longer available." /></DDialog>;
  }

  const detail = clientQuery.data;
  const { client } = detail;

  async function handleTransition(targetStatus: ClientStatus, reason: string) {
    await statusTransition.mutateAsync({ clientId: client.id, targetStatus, reason });
  }

  return (
    <>
      <DDialog
        open={open}
        onClose={onClose}
        size="xl"
        title={client.displayName}
        description={<><code className="client-code">{client.code}</code>{client.legalName ? ` · ${client.legalName}` : ''}</>}
        footer={
          <div className="client-dialog-actions">
            <DButton variant="outline" onClick={onClose}>Close</DButton>
            <DButton variant="outline" onClick={() => setIsEditDialogOpen(true)}>Edit Client</DButton>
            <ClientLifecycleAction client={client} isSubmitting={statusTransition.isPending} onTransition={handleTransition} />
          </div>
        }
      >
        <div className="client-detail-dialog">
          <div className="client-detail-header">
            <ClientStatusBadge status={client.status} />
          </div>
          {statusTransition.isError ? <p className="client-form-error">{statusTransition.error.message}</p> : null}
          <DTabs defaultValue="overview" value={tab} onValueChange={setTab} className="client-detail-tabs">
            <DTabsList><DTabsTrigger value="overview">Overview</DTabsTrigger><DTabsTrigger value="products">Products</DTabsTrigger><DTabsTrigger value="activity">Activity</DTabsTrigger></DTabsList>
            <DTabsContent value="overview">
              <DCard variant="outlined"><DCardContent><dl className="client-overview-list">
                <div><dt>Display Name</dt><dd>{client.displayName}</dd></div>
                <div><dt>Legal Name</dt><dd>{client.legalName ?? 'Not recorded'}</dd></div>
                <div><dt>Client Code</dt><dd><code className="client-code">{client.code}</code></dd></div>
                <div><dt>Status</dt><dd><ClientStatusBadge status={client.status} /></dd></div>
                <div><dt>Status Changed</dt><dd>{formatDate(client.statusChangedAt)}</dd></div>
                <div><dt>Created</dt><dd>{formatDate(client.createdAt)}</dd></div>
                <div><dt>Updated</dt><dd>{formatDate(client.updatedAt)}</dd></div>
              </dl></DCardContent></DCard>
            </DTabsContent>
            <DTabsContent value="products"><ClientProductsTab clientId={client.id} /></DTabsContent>
            <DTabsContent value="activity"><DCard variant="outlined"><DCardContent><ActivityTimeline activity={detail.activity} /></DCardContent></DCard></DTabsContent>
          </DTabs>
        </div>
      </DDialog>
      <ClientFormDialog open={isEditDialogOpen} mode="edit" client={client} onClose={() => setIsEditDialogOpen(false)} />
    </>
  );
}
