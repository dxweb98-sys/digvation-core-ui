import { DButton, DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, DStatusFilter, type TableAction, type TableColumn } from '@digvation-labs/ui';
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
  const [editClient, setEditClient] = useState<ClientListItem | null>(null);
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
  const tableActions: TableAction<ClientListItem>[] = [
    { label: 'Quick Detail', onClick: setQuickDetailClient },
    { label: 'Open Client', onClick: (client) => navigate(`/clients/${client.id}`) },
    { label: 'Edit Client', onClick: setEditClient },
  ];

  return (
    <div className="clients-page">
      <div className="clients-page-heading">
        <div>
          <p className="page-eyebrow">Customer control plane</p>
          <h1>Clients</h1>
          <p>Manage the organizations registered in Digvation’s control plane and their lifecycle state.</p>
        </div>
      </div>
      <DDataTable
        columns={CLIENT_COLUMNS}
        data={result.clients}
        rowKey="id"
        searchable
        searchPlaceholder="Search client name, legal name, or code"
        searchValue={query.search}
        onSearchChange={(search) => updateQuery({ search })}
        filters={
          <DStatusFilter
            label="Status"
            allLabel="All statuses"
            options={CLIENT_STATUS_OPTIONS}
            value={query.status}
            onChange={(status) => updateQuery({ status: status as ClientStatus | 'ALL' })}
          />
        }
        headerActions={<DButton onClick={() => setIsCreateDialogOpen(true)}>Add Client</DButton>}
        pagination={{ page: query.page, pageSize: query.limit, total: result.total }}
        onPageChange={(page) => updateQuery({ page })}
        onPageSizeChange={(limit) => updateQuery({ limit, page: 1 })}
        emptyMessage={<DEmptyState title="No clients found" description="Try another search or status filter, or add the first client." />}
        onRowClick={(client) => navigate(`/clients/${client.id}`)}
        actions={tableActions}
      />
      <ClientFormDialog open={isCreateDialogOpen} mode="create" onClose={() => setIsCreateDialogOpen(false)} />
      <ClientFormDialog open={editClient !== null} mode="edit" client={editClient ?? undefined} onClose={() => setEditClient(null)} />
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
