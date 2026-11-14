import { DDataTable, DEmptyState, DStatusFilter, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, Identity, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { RecordButton } from '../../../shared/ui/record-button';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { CLIENT_CREATE_FIELDS, createClientBody } from '../client-forms';
import { clientsApi, type Client } from '../clients-api';
import { clientKeys, useClients } from '../clients-queries';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const COLUMNS: TableColumn<Client>[] = [
  {
    key: 'display_name',
    label: 'Client',
    render: (client) => (
      <RecordButton>
        <Identity primary={client.display_name} secondary={client.legal_name} />
      </RecordButton>
    ),
  },
  { key: 'code', label: 'Code', render: (client) => <Code>{client.code}</Code> },
  { key: 'status', label: 'Status', render: (client) => <StatusBadge status={client.status} /> },
  { key: 'email', label: 'Email', render: (client) => client.email ?? '—' },
  { key: 'updated_at', label: 'Updated', render: (client) => formatInstant(client.updated_at) },
];

export function ClientListPage() {
  const navigate = useNavigate();
  const list = useListState();
  const clients = useClients(list.query);
  const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const create = useApiMutation(clientsApi.create, {
    success: 'Client added',
    invalidate: [clientKeys.all],
    toastErrors: false,
    onSuccess: (result) => navigate(`/clients/${result.client_id}`),
  });

  return (
    <Page>
      <PageHeader
        title="Clients"
        description="Organizations Digvation serves. Each client has one or more brands."
        actions={
          can(PERMISSIONS.CLIENTS_MANAGE) ? (
            <AppAction icon={Plus} onClick={() => setCreating(true)}>
              Add client
            </AppAction>
          ) : null
        }
      />
      <QueryState query={clients} label="clients">
        {(page) => (
          <DDataTable
            columns={COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Search code, display name, or legal name"
            {...list.tableProps}
            filters={
              <DStatusFilter
                label="Status"
                allLabel="All statuses"
                options={STATUS_OPTIONS}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            onRowClick={(client) => navigate(`/clients/${client.id}`)}
            emptyMessage={<DEmptyState title="No clients found" description="Try another search, or add a client." />}
          />
        )}
      </QueryState>
      <FormDialog
        open={creating}
        kind="wide"
        title="Add client"
        description="The client starts active, with a first brand and a primary contact."
        fields={CLIENT_CREATE_FIELDS}
        submitLabel="Add client"
        onSubmit={(values) => create.mutateAsync(createClientBody(values))}
        onClose={() => setCreating(false)}
      />
    </Page>
  );
}
