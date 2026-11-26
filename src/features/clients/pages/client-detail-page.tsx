import { DAlert, DDataTable, type TableColumn } from '@digvation/ui';
import { ChevronRight, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { formatInstant } from '../../../shared/format/date';
import { formatPhone } from '../../../shared/format/phone';
import { AppAction } from '../../../shared/ui/app-action';
import { Page, PageHeader } from '../../../shared/ui/page';
import { useRecordTrail } from '../../../shared/ui/record-trail';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import type { Business, ClientDetail } from '../clients-api';
import { clientPaths } from '../client-paths';
import { useClientsCopy } from '../clients-copy';
import { useClient } from '../clients-queries';
import { CardHeading, ClientStatusPill, InfoCard, InfoRow } from '../components/client-parts';
import { ClientPageState } from '../components/client-page-state';
import { ClientStatusDialog } from '../components/client-status-dialog';
import { EditClientDialog } from '../components/edit-client-dialog';
import '../clients.css';

/** Client detail (docs/design/07-clients.html, section B). */
export function ClientDetailPage() {
  const { clientId = '' } = useParams();
  const copy = useClientsCopy();
  const detail = useClient(clientId);
  const name = detail.data ? (detail.data.client.full_name ?? detail.data.client.code) : null;
  useRecordTrail(name ? [{ label: copy.title, to: clientPaths.list }, { label: name }] : null);

  if (!detail.data) return <ClientPageState query={detail} />;
  return <ClientDetailView detail={detail.data} />;
}

function ClientDetailView({ detail }: { detail: ClientDetail }) {
  const copy = useClientsCopy();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const { client, businesses } = detail;
  const banner = copy.banners[client.status];
  const canEdit = can(PERMISSIONS.CLIENTS_MANAGE) && client.status !== 'ARCHIVED';
  const canChangeStatus = can(PERMISSIONS.CLIENTS_LIFECYCLE_MANAGE);

  const columns: TableColumn<Business>[] = [
    {
      key: 'alias',
      label: copy.businessColumns.business,
      render: (business) => (
        <span className="clients-two">
          <Link
            to={clientPaths.business(client.id, business.id)}
            className="clients-row-link clients-code clients-alias"
            onClick={(event) => event.stopPropagation()}
          >
            {business.alias}
          </Link>
          <span className="clients-code clients-muted clients-small">{business.code}</span>
        </span>
      ),
    },
    {
      key: 'bill_to',
      label: copy.businessColumns.billedTo,
      render: (business) => (
        <span className="clients-two">
          <span>{business.bill_to.name}</span>
          <span className="clients-muted clients-small clients-table-only">{copy.nameSource[business.bill_to.name_source]}</span>
        </span>
      ),
    },
    { key: 'brands', label: copy.businessColumns.brands, align: 'right', render: (business) => business.brands.length },
    { key: 'contacts', label: copy.businessColumns.contacts, align: 'right', render: (business) => business.contacts.length },
    {
      key: 'open',
      label: <span className="visually-hidden">{copy.businessColumns.open}</span>,
      align: 'right',
      width: '48px',
      render: () => <ChevronRight size={16} aria-hidden="true" className="clients-chevron clients-cell-open" />,
    },
  ];

  return (
    <Page>
      <PageHeader
        title={client.full_name ?? client.code}
        meta={
          <span className="clients-meta-line">
            <span className="clients-code">{client.code}</span>
            <ClientStatusPill status={client.status} />
            <span className="clients-muted">{copy.statusSince(formatInstant(client.status_changed_at))}</span>
          </span>
        }
        actions={
          canChangeStatus || canEdit ? (
            <>
              {canChangeStatus ? (
                <AppAction tone="secondary" onClick={() => setChangingStatus(true)}>
                  {copy.changeStatus}
                </AppAction>
              ) : null}
              {canEdit ? (
                <AppAction tone="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                  {copy.edit}
                </AppAction>
              ) : null}
            </>
          ) : null
        }
      />
      {banner ? (
        <DAlert variant={client.status === 'SUSPENDED' ? 'warning' : 'info'} title={banner[0]} className="clients-banner">
          {banner[1]}
        </DAlert>
      ) : null}
      <div className="clients-grid">
        <div className="clients-main">
          <CardHeading title={copy.businesses} count={businesses.length} first />
          <section className="clients-business-table app-table-caps" aria-label={copy.businesses}>
            <DDataTable
              columns={columns}
              data={businesses}
              rowKey="id"
              onRowClick={(business) => navigate(clientPaths.business(client.id, business.id))}
            />
          </section>
        </div>
        <aside className="clients-side">
          <CardHeading title={copy.clientData} first />
          <InfoCard label={copy.clientData}>
            <InfoRow label={copy.fields.name}>{client.full_name}</InfoRow>
            <InfoRow label={copy.fields.email}>{client.email}</InfoRow>
            <InfoRow label={copy.fields.phone}>{formatPhone(client.phone)}</InfoRow>
            <InfoRow label={copy.fields.address}>{client.address}</InfoRow>
            <InfoRow label={copy.fields.registered}>{formatInstant(client.created_at)}</InfoRow>
          </InfoCard>
        </aside>
      </div>

      <EditClientDialog client={editing ? client : null} onClose={() => setEditing(false)} />
      <ClientStatusDialog client={changingStatus ? client : null} onClose={() => setChangingStatus(false)} />
    </Page>
  );
}
