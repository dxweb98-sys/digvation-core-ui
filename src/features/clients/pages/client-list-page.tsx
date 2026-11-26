import { DDataTable, DSelectFilter, type TableColumn } from '@digvation/ui';
import { AlertCircle, Building2, ChevronRight, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { calendarDateOf, formatBusinessDate } from '../../../shared/format/date';
import { formatPhone } from '../../../shared/format/phone';
import { AppAction } from '../../../shared/ui/app-action';
import { Page, PageHeader } from '../../../shared/ui/page';
import { StateBlock } from '../../../shared/ui/state-block';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import type { Client, ClientStatus } from '../clients-api';
import { clientPaths } from '../client-paths';
import { CLIENT_STATUSES } from '../client-rules';
import { useClientsCopy } from '../clients-copy';
import { useClients } from '../clients-queries';
import { ClientStatusPill } from '../components/client-parts';
import { RegisterClientDialog } from '../components/register-client-dialog';
import '../clients.css';

const clientPath = (client: Client) => clientPaths.client(client.id);

/** Clients list (docs/design/07-clients.html, section A). */
export function ClientListPage() {
  const copy = useClientsCopy();
  const navigate = useNavigate();
  const list = useListState();
  const clients = useClients(list.query);
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.CLIENTS_MANAGE);
  const [registering, setRegistering] = useState(false);

  const status = list.state.filters.status as ClientStatus | undefined;
  const filtered = Boolean(list.state.search.trim() || status);
  const page = clients.data;

  const contact = (client: Client) => [client.email, formatPhone(client.phone)].filter(Boolean);

  const columns: TableColumn<Client>[] = [
    {
      key: 'full_name',
      label: copy.columns.client,
      render: (client) => (
        <span className={`clients-two${client.status === 'ARCHIVED' ? ' clients-dim' : ''}`}>
          {/* The name is the row's link: Tab reaches it and Enter opens the client. */}
          <Link
            to={clientPath(client)}
            className="clients-row-link"
            onClick={(event) => event.stopPropagation()}
          >
            {client.full_name ?? client.code}
          </Link>
          <span className="clients-code clients-muted">{client.code}</span>
          {/* In the mobile card: status top right, then email · phone (board K25). */}
          <span className="clients-card-only clients-card-status">
            <ClientStatusPill status={client.status} />
          </span>
          <span className="clients-card-only clients-muted clients-small">{contact(client).join(' · ')}</span>
        </span>
      ),
    },
    {
      key: 'email',
      label: copy.columns.contact,
      render: (client) => (
        <span className={`clients-two clients-table-only${client.status === 'ARCHIVED' ? ' clients-dim' : ''}`}>
          {contact(client).map((line) => (
            <span key={line} className="clients-muted">
              {line}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      label: copy.columns.status,
      render: (client) => (
        <span className={`clients-cell-status${client.status === 'ARCHIVED' ? ' clients-dim' : ''}`}>
          <ClientStatusPill status={client.status} />
        </span>
      ),
    },
    {
      key: 'created_at',
      label: copy.columns.registered,
      render: (client) => (
        <span className={`clients-muted clients-cell-date${client.status === 'ARCHIVED' ? ' clients-dim' : ''}`}>
          {formatBusinessDate(calendarDateOf(client.created_at))}
        </span>
      ),
    },
    {
      key: 'open',
      label: <span className="visually-hidden">{copy.columns.open}</span>,
      align: 'right',
      width: '48px',
      render: () => <ChevronRight size={16} aria-hidden="true" className="clients-chevron clients-cell-open" />,
    },
  ];

  const clearFilters = () => {
    list.setSearch('');
    list.setFilter('status', 'ALL');
  };

  const empty = clients.isError ? (
    <StateBlock
      danger
      icon={<AlertCircle size={20} aria-hidden="true" />}
      title={copy.loadFailed[0]}
      body={copy.loadFailed[1]}
      action={
        <AppAction tone="secondary" loading={clients.isFetching} onClick={() => void clients.refetch()}>
          {copy.retry}
        </AppAction>
      }
    />
  ) : filtered ? (
    <StateBlock
      icon={<Search size={20} aria-hidden="true" />}
      title={copy.noMatch[0]}
      body={copy.noMatch[1]}
      action={
        <AppAction tone="secondary" onClick={clearFilters}>
          {copy.clearFilters}
        </AppAction>
      }
    />
  ) : undefined;

  // Nothing registered yet: no table, and no second button (the one in the header is enough).
  const neverRegistered = !filtered && page?.pagination.total === 0 && !clients.isError;

  return (
    <Page>
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          canManage ? (
            <AppAction icon={Plus} onClick={() => setRegistering(true)}>
              {copy.register}
            </AppAction>
          ) : null
        }
      />
      {neverRegistered ? (
        <section className="app-state-card" aria-label={copy.title}>
          <StateBlock icon={<Building2 size={20} aria-hidden="true" />} title={copy.empty[0]} body={copy.empty[1]} action={null} />
        </section>
      ) : (
        <section className="clients-table app-table-caps" aria-label={copy.title}>
          <DDataTable
            columns={columns}
            data={clients.isError ? [] : (page?.items ?? [])}
            rowKey="id"
            loading={clients.isPending}
            searchable
            searchPlaceholder={copy.search}
            {...list.tableProps}
            onRowClick={(client) => navigate(clientPath(client))}
            filters={
              <DSelectFilter
                label={copy.statusLabel}
                options={[
                  { value: 'ALL', label: copy.all },
                  ...CLIENT_STATUSES.map((value) => ({ value, label: copy.status[value] })),
                ]}
                value={status ?? 'ALL'}
                onChange={(value) => list.setFilter('status', value ? String(value) : 'ALL')}
              />
            }
            headerActions={
              page ? (
                <span className="clients-meta">
                  {copy.total(page.pagination.total)}
                  {status ? copy.activeFilter(copy.statusLabel, copy.status[status]) : null}
                </span>
              ) : null
            }
            pagination={
              page && !clients.isError
                ? { page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }
                : undefined
            }
            emptyMessage={empty}
          />
        </section>
      )}

      <RegisterClientDialog open={registering} onClose={() => setRegistering(false)} />
    </Page>
  );
}
