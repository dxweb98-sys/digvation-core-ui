import { DTabs, DTabsContent, DTabsList, DTabsTrigger } from '@digvation/ui';
import { useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { formatMoney } from '../../../shared/format/money';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { transitionLabel } from '../../../shared/labels/labels';
import { AppAction } from '../../../shared/ui/app-action';
import { DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { Code, Page, PageHeader, QueryState, Section } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS, type Permission } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { CLIENT_EDIT_FIELDS, clientFormValues, updateClientBody } from '../client-forms';
import { CLIENT_TRANSITIONS, clientsApi, type ClientDetail, type ClientStatus } from '../clients-api';
import { clientKeys, useClient } from '../clients-queries';
import { BrandsSection } from '../components/brands-section';
import { ContactsSection } from '../components/contacts-section';
import { ClientContractsTab } from '../../contracts/components/client-contracts-tab';
import { ClientServicesTab } from '../../services/components/client-services-tab';

interface ClientTab {
  value: string;
  label: string;
  permissions: readonly Permission[];
  render: (client: ClientDetail) => ReactNode;
}

const ARCHIVE_MESSAGE =
  'An archived client keeps its history but cannot be changed. CORE refuses while the client still has open services, unpaid invoices or unused credit, and says which.';

function OverviewTab({ client }: { client: ClientDetail }) {
  return (
    <div className="app-page">
      <Section title="Profile">
        <DetailList>
          <DetailItem label="Legal name">{client.legal_name}</DetailItem>
          <DetailItem label="Tax ID">{client.tax_identifier}</DetailItem>
          <DetailItem label="Email">{client.email}</DetailItem>
          <DetailItem label="Phone">{client.phone}</DetailItem>
          <DetailItem label="Website">{client.website}</DetailItem>
          <DetailItem label="Country">{client.country}</DetailItem>
          <DetailItem label="Time zone">{client.timezone}</DetailItem>
          <DetailItem label="Status since">{formatInstant(client.status_changed_at)}</DetailItem>
          <DetailItem label="Address" wide>
            {client.address}
          </DetailItem>
          <DetailItem label="Notes" wide>
            {client.notes}
          </DetailItem>
        </DetailList>
      </Section>
      <Section title="Client credit">
        {client.credit.length === 0 ? (
          <p className="form-dialog-message">No unallocated payments.</p>
        ) : (
          <div className="app-summary">
            {client.credit.map((credit) => (
              <div className="app-summary-item" key={credit.currency}>
                <span>Unallocated {credit.currency}</span>
                <strong>{formatMoney(credit.amount, credit.currency)}</strong>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/** Tabs of the client page; later areas add theirs here. */
const CLIENT_TABS: ClientTab[] = [
  { value: 'overview', label: 'Overview', permissions: [], render: (client) => <OverviewTab client={client} /> },
  { value: 'brands', label: 'Brands', permissions: [], render: (client) => <BrandsSection client={client} /> },
  { value: 'contacts', label: 'Contacts', permissions: [], render: (client) => <ContactsSection client={client} /> },
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
];

function ClientView({ client }: { client: ClientDetail }) {
  const { can, canAny } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<ClientStatus | null>(null);
  const invalidate = [clientKeys.all];
  const update = useApiMutation((values: Parameters<typeof updateClientBody>[0]) => clientsApi.update(client.id, updateClientBody(values)), {
    success: 'Client saved',
    invalidate,
    toastErrors: false,
  });
  const transition = useApiMutation(
    (input: { target: ClientStatus; reason: string }) =>
      clientsApi.transition(client.id, { target_status: input.target, reason: input.reason }),
    { success: (result) => `Client is now ${result.status.toLowerCase()}`, invalidate, toastErrors: false },
  );

  const tabs = CLIENT_TABS.filter((tab) => canAny(tab.permissions));
  const active = tabs.some((tab) => tab.value === params.get('tab')) ? params.get('tab')! : 'overview';
  const archived = client.status === 'ARCHIVED';

  return (
    <Page>
      <Link className="app-back-link" to="/clients">
        ← Clients
      </Link>
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
                  <AppAction
                    key={status}
                    tone={status === 'ARCHIVED' ? 'danger-subtle' : 'secondary'}
                    onClick={() => setTarget(status)}
                  >
                    {status === 'ACTIVE' ? (archived ? 'Restore' : 'Reactivate') : transitionLabel(status)}
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
            {active === tab.value ? tab.render(client) : null}
          </DTabsContent>
        ))}
      </DTabs>

      <FormDialog
        open={editing}
        kind="wide"
        title="Edit client"
        description="The client code cannot be changed."
        fields={CLIENT_EDIT_FIELDS}
        initialValues={clientFormValues(client)}
        submitLabel="Save client"
        onSubmit={(values) => update.mutateAsync(values)}
        onClose={() => setEditing(false)}
      />
      <ConfirmDialog
        open={target !== null}
        title={`${target === 'ACTIVE' ? (archived ? 'Restore' : 'Reactivate') : transitionLabel(target ?? '')} ${client.display_name}`}
        message={
          target === 'ARCHIVED'
            ? ARCHIVE_MESSAGE
            : target === 'SUSPENDED'
              ? 'A suspended client keeps its services and contracts but no new ones can be added.'
              : 'The client becomes active again.'
        }
        confirmLabel={target === 'ACTIVE' ? (archived ? 'Restore' : 'Reactivate') : transitionLabel(target ?? '')}
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
