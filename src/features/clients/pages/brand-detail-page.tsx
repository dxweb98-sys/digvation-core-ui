import { DDataTable, type TableColumn } from '@digvation/ui';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatBusinessDate, formatInstant } from '../../../shared/format/date';
import { formatMoney } from '../../../shared/format/money';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read, type FieldSpec } from '../../../shared/forms/form-spec';
import { labelFor, transitionLabel } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, FieldGrid, Identity, Page, PageBreadcrumb, PageHeader, QueryState, Section, type FieldItem } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { brandBody, brandEditFields, brandFormValues, startGroupBody, startGroupFields, startGroupFormValues } from '../client-forms';
import { clientsApi, type BrandDetail, type ClientDetail } from '../clients-api';
import { clientKeys, useBrandDetail, useClient } from '../clients-queries';

const BILL_TO_SOURCE: Record<BrandDetail['bill_to']['source'], string> = { BRAND: 'Legal entity brand ini',
  GROUP: 'Legal entity default group brand ini',
  CLIENT: 'Nama client ini' };

/** Who a resolved contact belongs to, so a fallback is visible instead of implied. */
const CONTACT_SOURCE: Record<BrandDetail['billing_contact_source'], string> = { BRAND: 'Kontak penagihan brand ini',
  GROUP: 'Kontak penagihan group brand ini',
  CLIENT: 'Kontak penagihan client ini',
  NONE: '' };

const PIC_SOURCE: Record<BrandDetail['pic_source'], string> = { BRAND: 'PIC brand ini',
  GROUP: 'PIC group brand ini',
  CLIENT: 'PIC client ini',
  NONE: '' };

/** Where invoices of this brand go, in one line the operator can read. */
function billToItems(brand: BrandDetail): FieldItem[] { const entity = brand.bill_to.legal_entity;
  return [
    { label: 'Ditagih ke', value: BILL_TO_SOURCE[brand.bill_to.source] },
    { label: 'Nama di invoice',
      value: entity ? entity.name : brand.bill_to.source === 'CLIENT' ? 'Nama client' : null },
    { label: 'Nama legal', value: entity?.legal_name },
    { label: 'NPWP', value: entity?.tax_identifier },
    { label: 'Email penagihan',
      value: brand.billing_contacts.length ? (
        <Identity
          primary={brand.billing_contacts.map((contact) => contact.email ?? contact.name).join(', ')}
          secondary={CONTACT_SOURCE[brand.billing_contact_source]}
        />
      ) : null },
    { label: 'PIC',
      value: brand.pic_contacts.length ? (
        <Identity
          primary={brand.pic_contacts.map((contact) => contact.name).join(', ')}
          secondary={PIC_SOURCE[brand.pic_source]}
        />
      ) : null },
  ];
}

const SERVICE_COLUMNS: TableColumn<BrandDetail['services'][number]>[] = [
  { key: 'product', label: 'Product', render: (row) => <Identity primary={row.product.name} secondary={row.product.code} /> },
  { key: 'status', label: 'Status', width: '180px', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'contract',
    label: 'Contract',
    width: '180px',
    render: (row) => (row.contract ? <StatusBadge status={row.contract.status} /> : <span className="not-set">Belum ada contract</span>) },
];

const ADD_ON_COLUMNS: TableColumn<BrandDetail['add_ons'][number]>[] = [
  { key: 'name', label: 'Add-on', render: (row) => <Identity primary={row.name} secondary={row.code} /> },
  { key: 'status', label: 'Status', width: '180px', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'contract_add_on',
    label: 'Disepakati',
    width: '220px',
    align: 'right',
    render: (row) =>
      row.contract_add_on ? (
        <span className="app-amount">{formatMoney(row.contract_add_on.agreed_amount, row.contract_add_on.currency)}</span>
      ) : (
        <span className="not-set">Tidak ditagih lewat contract</span>
      ) },
  { key: 'effective',
    label: 'Berlaku sejak',
    width: '160px',
    render: (row) => formatBusinessDate(row.contract_add_on?.effective_from) },
];

const INSTALLATION_COLUMNS: TableColumn<BrandDetail['installations'][number]>[] = [
  { key: 'name', label: 'Instalasi', render: (row) => <Identity primary={row.name} secondary={row.code} /> },
  { key: 'deployment_mode', label: 'Mode', width: '160px', render: (row) => labelFor(row.deployment_mode) },
  { key: 'environment', label: 'Environment', width: '160px', render: (row) => labelFor(row.environment) },
  { key: 'status', label: 'Status', width: '180px', render: (row) => <StatusBadge status={row.status} /> },
];

function BrandView({ client, brand }: { client: ClientDetail; brand: BrandDetail }) { const navigate = useNavigate();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [target, setTarget] = useState<'ACTIVE' | 'ARCHIVED' | null>(null);
  const invalidate = [
    clientKeys.detail(client.id),
    clientKeys.brands(client.id),
    clientKeys.brand(client.id, brand.id),
  ];
  const archived = brand.status === 'ARCHIVED';
  const clientReadonly = client.status === 'ARCHIVED';
  const canManage = can(PERMISSIONS.CLIENTS_MANAGE) && !clientReadonly;

  const update = useApiMutation(
    (body: ReturnType<typeof brandBody>) => clientsApi.updateBrand(client.id, brand.id, body),
    { success: 'Brand tersimpan', invalidate, toastErrors: false },
  );
  const changeStatus = useApiMutation(
    (body: { target_status: 'ACTIVE' | 'ARCHIVED'; reason: string }) =>
      clientsApi.transitionBrand(client.id, brand.id, body),
    { success: (result) => `Brand sekarang ${labelFor(result.status).toLowerCase()}`, invalidate, toastErrors: false },
  );
  const move = useApiMutation(
    (body: { group_id: string }) => clientsApi.moveBrandToGroup(client.id, brand.id, body),
    { success: 'Brand dipindahkan', invalidate, toastErrors: false },
  );
  const startGroup = useApiMutation(
    (body: ReturnType<typeof startGroupBody>) => clientsApi.startBrandGroup(client.id, brand.id, body),
    { success: 'Group baru dibuat dan brand dipindahkan', invalidate, toastErrors: false },
  );

  const otherGroups = useMemo(() => client.groups.filter((group) => group.id !== brand.group_id), [client.groups, brand.group_id]);
  const editFields = useMemo(() => brandEditFields(client.legal_entities), [client.legal_entities]);
  const moveFields: FieldSpec[] = [
    { name: 'group_id',
      label: 'Pindah ke group',
      kind: 'select',
      required: true,
      options: otherGroups.map((group) => ({ value: group.id, label: group.name })),
      hint: 'Group yang ditinggalkan otomatis terhapus saat brand terakhirnya keluar.' },
  ];

  return (
    <Page>
      <PageBreadcrumb
        trail={[
          { label: 'Clients', to: '/clients' },
          { label: client.display_name, to: `/clients/${client.id}` },
          { label: brand.name },
        ]}
      />
      <PageHeader
        title={brand.name}
        meta={ <>
            <Code>{brand.code}</Code>
            <StatusBadge status={brand.status} />
            {brand.group ? (
              <Link className="app-quiet-link" to={`/clients/${client.id}?tab=groups`}>
                Group: {brand.group.name}
              </Link>
            ) : (
              <span className="not-set">Tanpa group</span>
            )}
          </>
        }
        description={brand.description ?? undefined}
        actions={ <>
            {canManage && !archived ? (
              otherGroups.length > 0 ? (
                <AppAction tone="secondary" onClick={() => setMoving(true)}>
                  Pindahkan ke group
                </AppAction>
              ) : (
                <AppAction tone="secondary" onClick={() => setStarting(true)}>
                  Mulai group baru
                </AppAction>
              )
            ) : null}
            {can(PERMISSIONS.CLIENTS_LIFECYCLE_MANAGE) && !clientReadonly ? (
              <AppAction tone="secondary" onClick={() => setTarget(archived ? 'ACTIVE' : 'ARCHIVED')}>
                {archived ? 'Aktifkan kembali' : transitionLabel('ARCHIVED')}
              </AppAction>
            ) : null}
            {canManage ? (
              <AppAction onClick={() => setEditing(true)}>Edit brand</AppAction>
            ) : null}
          </>
        }
      />

      <Section title="Penagihan">
        <FieldGrid
          items={billToItems(brand)}
          emptyLabel="Brand ini belum punya kontak penagihan. Invoice memakai nama client sampai ada kontak penagihan dengan email."
        />
      </Section>

      <Section title="Service">
        <DDataTable
          columns={SERVICE_COLUMNS}
          data={brand.services}
          rowKey="id"
          onRowClick={(row) => navigate(`/clients/${client.id}/services/${row.id}`)}
          emptyMessage="Belum ada service. Provision sebuah product untuk brand ini dari halaman client."
        />
      </Section>

      <Section title="Add-on">
        <DDataTable
          columns={ADD_ON_COLUMNS}
          data={brand.add_ons}
          rowKey="client_add_on_id"
          emptyMessage="Belum ada add-on. Add-on dijual di atas sebuah service brand ini."
        />
      </Section>

      <Section title="Instalasi">
        <DDataTable
          columns={INSTALLATION_COLUMNS}
          data={brand.installations}
          rowKey="id"
          emptyMessage="Belum ada instalasi. Service brand ini belum terpasang di host mana pun."
        />
      </Section>

      <Section title="Brand">
        <FieldGrid
          items={[
            { label: 'Situs web', value: brand.website },
            { label: 'Warna utama', value: brand.primary_color },
            { label: 'Warna sekunder', value: brand.secondary_color },
            { label: 'URL logo', value: brand.logo_url },
            { label: 'Status sejak', value: formatInstant(brand.status_changed_at) },
          ]}
          emptyLabel="Brand ini belum punya identitas visual."
        />
      </Section>

      <FormDialog
        open={editing}
        kind="wide"
        title="Edit brand"
        description={<Code>{brand.code}</Code>}
        fields={editFields}
        initialValues={brandFormValues(brand)}
        submitLabel="Simpan brand"
        onSubmit={(values) => update.mutateAsync(brandBody(values))}
        onClose={() => setEditing(false)}
      />
      <FormDialog
        open={moving}
        title="Pindahkan ke group"
        description={brand.name}
        fields={moveFields}
        submitLabel="Pindahkan"
        onSubmit={(values) => move.mutateAsync({ group_id: read.text(values, 'group_id') })}
        onClose={() => setMoving(false)}
      />
      <FormDialog
        open={starting}
        title="Mulai group baru"
        description={`Group baru akan berisi brand ${brand.name}.`}
        fields={startGroupFields(brand.name, client.legal_entities)}
        initialValues={startGroupFormValues(brand)}
        submitLabel="Buat group"
        onSubmit={(values) => startGroup.mutateAsync(startGroupBody(values))}
        onClose={() => setStarting(false)}
      />
      <ConfirmDialog
        open={target !== null}
        title={`${target === 'ACTIVE' ? 'Aktifkan kembali' : transitionLabel('ARCHIVED')} ${brand.name}`}
        message={ target === 'ARCHIVED'
            ? 'Brand yang diarsipkan tidak bisa mendapat service baru. CORE menolaknya selama brand masih punya service yang belum ditutup atau invoice belum lunas.'
            : 'Brand kembali aktif.'
        }
        confirmLabel={target === 'ACTIVE' ? 'Aktifkan kembali' : transitionLabel('ARCHIVED')}
        tone={target === 'ACTIVE' ? 'primary' : 'danger'}
        reason={{}}
        onConfirm={(values) =>
          changeStatus.mutateAsync({ target_status: target!, reason: read.text(values, 'reason') })
        }
        onClose={() => setTarget(null)}
      />
    </Page>
  );
}

export function BrandDetailPage() { const { clientId = '', brandId = '' } = useParams();
  const brand = useBrandDetail(clientId, brandId);
  const client = useClient(clientId);
  return (
    <QueryState query={brand} label="brand">
      {(data) => (
        <QueryState query={client} label="client">
          {(owner) => <BrandView client={owner} brand={data} />}
        </QueryState>
      )}
    </QueryState>
  );
}
