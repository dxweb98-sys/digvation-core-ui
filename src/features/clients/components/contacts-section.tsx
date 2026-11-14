import { DBadge, DDataTable, DEmptyState, type TableAction, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { AppAction } from '../../../shared/ui/app-action';
import { Identity, Section } from '../../../shared/ui/page';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { contactBody, contactFields, contactFormValues } from '../client-forms';
import { clientsApi, type ClientDetail, type Contact } from '../clients-api';
import { clientKeys } from '../clients-queries';

export function ContactsSection({ client }: { client: ClientDetail }) {
  const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const invalidate = [clientKeys.detail(client.id), clientKeys.brands(client.id)];
  const archived = client.status === 'ARCHIVED';
  const brandName = new Map(client.brands.map((brand) => [brand.id, brand.name]));

  const create = useApiMutation(
    (body: ReturnType<typeof contactBody>) => clientsApi.createContact(client.id, body),
    { success: 'Contact added', invalidate, toastErrors: false },
  );
  const update = useApiMutation(
    (input: { contactId: string; body: ReturnType<typeof contactBody> }) =>
      clientsApi.updateContact(client.id, input.contactId, input.body),
    { success: 'Contact saved', invalidate, toastErrors: false },
  );
  const remove = useApiMutation((contact: Contact) => clientsApi.deleteContact(client.id, contact.id), {
    success: 'Contact deleted',
    invalidate,
    toastErrors: false,
  });

  const columns: TableColumn<Contact>[] = [
    { key: 'name', label: 'Name', render: (contact) => <Identity primary={contact.name} secondary={contact.position} /> },
    { key: 'email', label: 'Email', render: (contact) => contact.email ?? '—' },
    { key: 'phone', label: 'Phone', render: (contact) => contact.phone ?? '—' },
    {
      key: 'brand_id',
      label: 'Scope',
      render: (contact) => (contact.brand_id ? brandName.get(contact.brand_id) ?? 'Brand' : 'Client'),
    },
    {
      key: 'is_primary',
      label: 'Roles',
      render: (contact) => (
        <span className="app-page-actions">
          {contact.is_primary ? <DBadge variant="primary">Primary</DBadge> : null}
          {contact.is_billing ? <DBadge variant="info">Billing</DBadge> : null}
          {contact.is_technical ? <DBadge variant="outline">Technical</DBadge> : null}
        </span>
      ),
    },
  ];

  const canManage = can(PERMISSIONS.CLIENTS_MANAGE) && !archived;
  const actions: TableAction<Contact>[] = canManage
    ? [
        { label: 'Edit', onClick: setEditing },
        { label: 'Delete', variant: 'danger', show: (contact) => !contact.is_primary, onClick: setDeleting },
      ]
    : [];
  const createFields = useMemo(() => contactFields(client.brands), [client.brands]);
  const editFields = useMemo(() => contactFields(client.brands, editing ?? undefined), [client.brands, editing]);

  return (
    <Section
      title="Contacts"
      actions={
        canManage ? (
          <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
            Add contact
          </AppAction>
        ) : null
      }
    >
      <DDataTable
        columns={columns}
        data={client.contacts}
        rowKey="id"
        actions={actions.length ? actions : undefined}
        emptyMessage={<DEmptyState title="No contacts" description="Add the people Digvation works with." />}
      />
      <FormDialog
        open={creating}
        title="Add contact"
        fields={createFields}
        initialValues={contactFormValues()}
        submitLabel="Add contact"
        onSubmit={(values) => create.mutateAsync(contactBody(values))}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title="Edit contact"
        fields={editFields}
        initialValues={contactFormValues(editing ?? undefined)}
        submitLabel="Save contact"
        onSubmit={(values) => update.mutateAsync({ contactId: editing!.id, body: contactBody(values) })}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete contact"
        message={`${deleting?.name ?? ''} is removed from this client. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => remove.mutateAsync(deleting!)}
        onClose={() => setDeleting(null)}
      />
    </Section>
  );
}
