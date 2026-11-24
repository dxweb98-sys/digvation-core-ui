import { DDataTable, DStatusFilter, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
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
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'SUSPENDED', label: 'Ditangguhkan' },
  { value: 'ARCHIVED', label: 'Diarsipkan' },
];

const COLUMNS: TableColumn<Client>[] = [
  { key: 'display_name',
    label: 'Client',
    render: (client) => (
      <RecordButton>
        <Identity primary={client.display_name} secondary={client.legal_name} />
      </RecordButton>
    ) },
  { key: 'code', label: 'Code', width: '240px', render: (client) => <Code>{client.code}</Code> },
  { key: 'status', label: 'Status', width: '200px', render: (client) => <StatusBadge status={client.status} /> },
];

export function ClientListPage() { const navigate = useNavigate();
  const list = useListState();
  const clients = useClients(list.query);
  const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const create = useApiMutation(clientsApi.create, { success: 'Client ditambahkan',
    invalidate: [clientKeys.all],
    toastErrors: false,
    onSuccess: (result) => navigate(`/clients/${result.client_id}`) });

  return (
    <Page>
      <PageHeader
        title="Clients"
        description="Organisasi yang Digvation layani. Setiap client punya satu atau lebih brand."
        actions={ can(PERMISSIONS.CLIENTS_MANAGE) ? (
            <AppAction icon={Plus} onClick={() => setCreating(true)}>
              Tambah client
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
            searchPlaceholder="Cari code, nama, atau nama legal"
            {...list.tableProps}
            filters={ <DStatusFilter
                label="Status"
                allLabel="Semua status"
                options={STATUS_OPTIONS}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            onRowClick={(client) => navigate(`/clients/${client.id}`)}
            emptyMessage="Client tidak ditemukan. Coba kata lain, atau tambahkan client."
          />
        )}
      </QueryState>
      <FormDialog
        open={creating}
        kind="wide"
        title="Tambah client"
        description="Client langsung aktif, dengan satu brand pertama dan satu kontak utama."
        fields={CLIENT_CREATE_FIELDS}
        submitLabel="Tambah client"
        onSubmit={(values) => create.mutateAsync(createClientBody(values))}
        onClose={() => setCreating(false)}
      />
    </Page>
  );
}
