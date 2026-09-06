import { DButton, DCard, DCardContent, DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, DPagination, DSearchInput, DStatusFilter, type TableColumn } from '@digvation-labs/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ClientFormDialog } from '../components/client-form-dialog';
import { ClientQuickDetailDialog } from '../components/client-quick-detail-dialog';
import { ClientStatusBadge } from '../components/client-status-badge';
import { useClientList } from '../hooks/use-client-list';
import type { ClientListItem, ClientListQuery, ClientStatus } from '../types/client';
import '../clients.css';

const PAGE_LIMIT = 10;

const CLIENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const CLIENT_COLUMNS: TableColumn<ClientListItem>[] = [
  {
    key: 'displayName',
    label: 'Client',
    render: (client) => (
      <div className="client-table-identity">
        <strong>{client.displayName}</strong>
        <span>{client.legalName ?? 'No legal name recorded'}</span>
      </div>
    ),
  },
  { key: 'code', label: 'Code', render: (client) => <code className="client-code">{client.code}</code> },
  { key: 'status', label: 'Status', render: (client) => <ClientStatusBadge status={client.status} /> },
  { key: 'productCount', label: 'Products', render: (client) => `${client.productCount} product${client.productCount === 1 ? '' : 's'}` },
  { key: 'updatedAt', label: 'Updated', render: (client) => formatClientDate(client.updatedAt) },
];

function formatClientDate(value: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function ClientListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<ClientListQuery>({ search: '', status: 'ALL', page: 1, limit: PAGE_LIMIT });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [quickDetailClient, setQuickDetailClient] = useState<ClientListItem | null>(null);
  const clientQuery = useClientList(query);

  function updateQuery(nextQuery: Partial<ClientListQuery>) {
    setQuery((currentQuery) => ({
      ...currentQuery,
      ...nextQuery,
      page: nextQuery.page ?? (nextQuery.search !== undefined || nextQuery.status !== undefined ? 1 : currentQuery.page),
    }));
  }

  if (clientQuery.isPending) {
    return <div className="clients-page-state"><DLoadingIndicator label="Loading clients" /></div>;
  }

  if (clientQuery.isError) {
    return <div className="clients-page-state"><DConnectionError title="Client list unavailable" message="Client records could not be loaded from the selected data source." detail={clientQuery.error.message} isRetrying={clientQuery.isFetching} onRetry={() => void clientQuery.refetch()} /></div>;
  }

  const result = clientQuery.data;

  return (
    <div className="clients-page">
      <div className="clients-page-heading">
        <div>
          <p className="page-eyebrow">Customer control plane</p>
          <h1>Clients</h1>
          <p>Manage the organizations registered in Digvation’s control plane and their lifecycle state.</p>
        </div>
        <DButton onClick={() => setIsCreateDialogOpen(true)}>Add Client</DButton>
      </div>
      <DCard className="client-list-card" variant="outlined">
        <DCardContent>
          <div className="client-list-toolbar">
            <DSearchInput value={query.search} onChange={(search) => updateQuery({ search })} placeholder="Search client name, legal name, or code" />
            <DStatusFilter
              label="Status"
              allLabel="All statuses"
              options={CLIENT_STATUS_OPTIONS}
              value={query.status}
              onChange={(status) => updateQuery({ status: status as ClientStatus | 'ALL' })}
            />
          </div>
          {result.total === 0 ? (
            <DEmptyState title="No clients found" description="Try another search or status filter, or add the first client." />
          ) : (
            <>
              <DDataTable
                columns={CLIENT_COLUMNS}
                data={result.clients}
                rowKey="id"
                onRowClick={(client) => navigate(`/clients/${client.id}`)}
                actions={(client) => (
                  <div className="client-table-actions">
                    <DButton size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); setQuickDetailClient(client); }}>Quick detail</DButton>
                    <DButton size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); navigate(`/clients/${client.id}`); }}>Open</DButton>
                  </div>
                )}
              />
              <div className="client-list-footer">
                <span>{result.total} clients</span>
                <DPagination page={query.page} totalPages={result.totalPages} onChange={(page) => updateQuery({ page })} />
              </div>
            </>
          )}
        </DCardContent>
      </DCard>
      <ClientFormDialog open={isCreateDialogOpen} mode="create" onClose={() => setIsCreateDialogOpen(false)} />
      <ClientQuickDetailDialog
        client={quickDetailClient}
        onClose={() => setQuickDetailClient(null)}
        onOpenClient={(clientId) => {
          setQuickDetailClient(null);
          navigate(`/clients/${clientId}`);
        }}
      />
    </div>
  );
}
