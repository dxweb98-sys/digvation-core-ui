import { DBadge, DButton, DCard, DCardContent, DConnectionError, DEmptyState, DLoadingIndicator, DTabs, DTabsContent, DTabsList, DTabsTrigger } from '@digvation-labs/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ClientLifecycleAction } from '../components/client-lifecycle-action';
import { ClientStatusBadge } from '../components/client-status-badge';
import { useClientDetail } from '../hooks/use-client-detail';
import { useClientStatusTransition } from '../hooks/use-client-mutations';
import type { ClientActivity, ClientStatus } from '../types/client';
import '../clients.css';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ActivityTimeline({ activity }: { activity: ClientActivity[] }) {
  if (activity.length === 0) return <DEmptyState title="No client activity" description="Administrative lifecycle activity will appear here." />;
  return <div className="client-activity-list">{activity.map((entry) => <article className="client-activity-item" key={entry.id}><time>{formatDate(entry.occurredAt)}</time><span aria-hidden="true" /><div><h3>{entry.title}</h3><p>{entry.description}</p></div></article>)}</div>;
}

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { clientId = '' } = useParams();
  const [tab, setTab] = useState('overview');
  const clientQuery = useClientDetail(clientId);
  const statusTransition = useClientStatusTransition();

  if (clientQuery.isPending) return <div className="clients-page-state"><DLoadingIndicator label="Loading client detail" /></div>;
  if (clientQuery.isError) return <div className="clients-page-state"><DConnectionError title="Client unavailable" message="Client information could not be loaded." detail={clientQuery.error.message} onRetry={() => void clientQuery.refetch()} /></div>;
  if (!clientQuery.data) return <div className="clients-page-state"><DEmptyState title="Client not found" description="The requested client record does not exist or is no longer available." /></div>;

  const detail = clientQuery.data;
  const { client } = detail;

  async function handleTransition(targetStatus: ClientStatus, reason: string) {
    await statusTransition.mutateAsync({ clientId: client.id, targetStatus, reason });
  }

  return (
    <div className="client-detail-page">
      <div className="client-detail-header">
        <div>
          <button className="client-back-link" type="button" onClick={() => navigate('/clients')}>← Clients</button>
          <div className="client-title-row"><h1>{client.displayName}</h1><ClientStatusBadge status={client.status} /></div>
          <p><code className="client-code">{client.code}</code>{client.legalName ? ` · ${client.legalName}` : ''}</p>
        </div>
        <div className="client-header-actions">
          <DButton variant="outline" onClick={() => navigate(`/clients/${client.id}/edit`)}>Edit Client</DButton>
          <ClientLifecycleAction client={client} isSubmitting={statusTransition.isPending} onTransition={handleTransition} />
        </div>
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
        <DTabsContent value="products">
          <DCard variant="outlined"><DCardContent>{detail.productRelationships.length === 0 ? <DEmptyState title="No product relationships" description="Product relationships will be managed in a later domain." /> : <div className="client-product-list">{detail.productRelationships.map((relationship) => <article key={relationship.id}><div><strong>{relationship.productName}</strong><span>Client product relationship</span></div><DBadge variant={relationship.status === 'ACTIVE' ? 'success' : 'info'} dot>{relationship.status}</DBadge></article>)}</div>}</DCardContent></DCard>
        </DTabsContent>
        <DTabsContent value="activity"><DCard variant="outlined"><DCardContent><ActivityTimeline activity={detail.activity} /></DCardContent></DCard></DTabsContent>
      </DTabs>
    </div>
  );
}
