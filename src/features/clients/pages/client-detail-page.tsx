import { DTabs, DTabsContent, DTabsList, DTabsTrigger } from '@digvation/ui';
import { useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { formatMoney } from '../../../shared/format/money';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { labelFor, transitionLabel } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, FieldGrid, Page, PageBreadcrumb, PageHeader, QueryState, Section, StatStrip, TabPanel, type StatItem } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS, type Permission } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { CLIENT_EDIT_FIELDS, clientFormValues, updateClientBody } from '../client-forms';
import { CLIENT_TRANSITIONS, clientsApi, type ClientDetail, type ClientStatus } from '../clients-api';
import { clientKeys, useClient } from '../clients-queries';
import { BrandsSection } from '../components/brands-section';
import { ContactsSection } from '../components/contacts-section';
import { GroupsSection } from '../components/groups-section';
import { LegalEntitiesSection } from '../components/legal-entities-section';
import { ClientBillingTab } from '../../billing/components/client-billing-tab';
import { ClientContractsTab } from '../../contracts/components/client-contracts-tab';
import { ClientServicesTab } from '../../services/components/client-services-tab';

interface ClientTab {
  value: string;
  label: string;
  permissions: readonly Permission[];
  render: (client: ClientDetail) => ReactNode;
}

const ARCHIVE_MESSAGE =
  'Client yang diarsipkan tetap punya riwayat tetapi tidak bisa diubah lagi. CORE menolaknya selama client masih punya service yang belum ditutup, invoice belum lunas, atau kredit yang belum dipakai, dan menyebut mana yang menahan.';

/** The counts and credit the client carries, as one line rather than a card each. */
const SUMMARY_ITEMS: { key: keyof ClientDetail['summary']; label: string }[] = [
  { key: 'groups', label: 'Group' },
  { key: 'brands', label: 'Brands' },
  { key: 'legal_entities', label: 'Legal entity' },
  { key: 'contacts', label: 'Kontak' },
  { key: 'services_open', label: 'Service aktif' },
  { key: 'contracts_active', label: 'Contract aktif' },
  { key: 'installations', label: 'Instalasi' },
];

function OverviewTab({ client }: { client: ClientDetail }) {
  const stats: StatItem[] = [
    ...SUMMARY_ITEMS.map((item) => ({
      label: item.label,
      value: client.summary[item.key],
      show: client.summary[item.key] > 0,
    })),
    ...client.credit.map((credit) => ({
      label: `Kredit ${credit.currency} belum dipakai`,
      value: formatMoney(credit.amount, credit.currency),
    })),
  ];

  return (
    <div className="app-page">
      <Section title="Profil client">
        <FieldGrid
          items={[
            { label: 'Nama legal', value: client.legal_name },
            { label: 'NPWP', value: client.tax_identifier },
            { label: 'Email', value: client.email },
            { label: 'Telepon', value: client.phone },
            { label: 'Situs web', value: client.website },
            { label: 'Negara', value: client.country },
            { label: 'Zona waktu', value: client.timezone },
            { label: 'Status sejak', value: formatInstant(client.status_changed_at) },
            { label: 'Alamat', value: client.address },
            { label: 'Catatan', value: client.notes },
          ]}
          emptyLabel="Profil client belum diisi. Gunakan Edit client untuk melengkapi nama legal, NPWP, dan kontaknya."
        />
      </Section>
      <Section title="Ringkasan">
        <StatStrip items={stats} emptyLabel="Client ini belum punya brand, kontak, service, atau kredit." />
      </Section>
    </div>
  );
}

/** Tabs of the client page; later areas add theirs here. */
const CLIENT_TABS: ClientTab[] = [
  { value: 'overview', label: 'Ringkasan', permissions: [], render: (client) => <OverviewTab client={client} /> },
  { value: 'brands', label: 'Brands', permissions: [], render: (client) => <BrandsSection client={client} /> },
  { value: 'groups', label: 'Groups', permissions: [], render: (client) => <GroupsSection client={client} /> },
  { value: 'contacts', label: 'Contacts', permissions: [], render: (client) => <ContactsSection client={client} /> },
  {
    value: 'legal-entities',
    label: 'Legal entity',
    permissions: [],
    render: (client) => <LegalEntitiesSection client={client} />,
  },
  {
    value: 'services',
    label: 'Services',
    permissions: [PERMISSIONS.SERVICES_READ],
    render: (client) => <ClientServicesTab client={client} />,
  },
  {
    value: 'contracts',
    label: 'Contracts',
    permissions: [PERMISSIONS.CONTRACTS_READ],
    render: (client) => <ClientContractsTab client={client} />,
  },
  {
    value: 'billing',
    label: 'Billing',
    permissions: [PERMISSIONS.BILLING_READ],
    render: (client) => <ClientBillingTab client={client} />,
  },
];

/** The label of the action that returns a client to ACTIVE. */
function activateLabel(archived: boolean) {
  return archived ? 'Pulihkan' : 'Aktifkan kembali';
}

function ClientView({ client }: { client: ClientDetail }) {
  const { can, canAny } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<ClientStatus | null>(null);
  const invalidate = [clientKeys.all];
  const update = useApiMutation((values: Parameters<typeof updateClientBody>[0]) => clientsApi.update(client.id, updateClientBody(values)), {
    success: 'Client tersimpan',
    invalidate,
    toastErrors: false,
  });
  const transition = useApiMutation(
    (input: { target: ClientStatus; reason: string }) =>
      clientsApi.transition(client.id, { target_status: input.target, reason: input.reason }),
    { success: (result) => `Client sekarang ${labelFor(result.status).toLowerCase()}`, invalidate, toastErrors: false },
  );

  const tabs = CLIENT_TABS.filter((tab) => canAny(tab.permissions));
  const requested = params.get('tab');
  const active = tabs.some((tab) => tab.value === requested) ? requested! : 'overview';
  const archived = client.status === 'ARCHIVED';

  return (
    <Page>
      <PageBreadcrumb trail={[{ label: 'Clients', to: '/clients' }, { label: client.display_name }]} />
      <PageHeader
        title={client.display_name}
        meta={
          <>
            <Code>{client.code}</Code>
            <StatusBadge status={client.status} />
          </>
        }
        actions={
          <>
            {can(PERMISSIONS.CLIENTS_LIFECYCLE_MANAGE)
              ? CLIENT_TRANSITIONS[client.status].map((status) => (
                  <AppAction key={status} tone="secondary" onClick={() => setTarget(status)}>
                    {status === 'ACTIVE' ? activateLabel(archived) : transitionLabel(status)}
                  </AppAction>
                ))
              : null}
            {can(PERMISSIONS.CLIENTS_MANAGE) && !archived ? (
              <AppAction onClick={() => setEditing(true)}>Edit client</AppAction>
            ) : null}
          </>
        }
      />

      <DTabs value={active} defaultValue="overview" onValueChange={(tab) => setParams({ tab }, { replace: true })}>
        <DTabsList>
          {tabs.map((tab) => (
            <DTabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </DTabsTrigger>
          ))}
        </DTabsList>
        {tabs.map((tab) => (
          <DTabsContent key={tab.value} value={tab.value}>
            <TabPanel>{tab.render(client)}</TabPanel>
          </DTabsContent>
        ))}
      </DTabs>

      <FormDialog
        open={editing}
        kind="wide"
        title="Edit client"
        description="Code client tidak bisa diubah."
        fields={CLIENT_EDIT_FIELDS}
        initialValues={clientFormValues(client)}
        submitLabel="Simpan client"
        onSubmit={(values) => update.mutateAsync(values)}
        onClose={() => setEditing(false)}
      />
      <ConfirmDialog
        open={target !== null}
        title={`${target === 'ACTIVE' ? activateLabel(archived) : transitionLabel(target ?? '')} ${client.display_name}`}
        message={
          target === 'ARCHIVED'
            ? ARCHIVE_MESSAGE
            : target === 'SUSPENDED'
              ? 'Service dan contract yang ada tetap jalan, tetapi client ini tidak bisa ditambah yang baru.'
              : 'Client kembali aktif.'
        }
        confirmLabel={target === 'ACTIVE' ? activateLabel(archived) : transitionLabel(target ?? '')}
        tone={target === 'ACTIVE' ? 'primary' : 'danger'}
        reason={{}}
        onConfirm={(values) => transition.mutateAsync({ target: target!, reason: read.text(values, 'reason') })}
        onClose={() => setTarget(null)}
      />
    </Page>
  );
}

export function ClientDetailPage() {
  const { clientId = '' } = useParams();
  const client = useClient(clientId);
  return <QueryState query={client} label="client">{(data) => <ClientView client={data} />}</QueryState>;
}
