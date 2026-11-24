import { DBadge, DDataTable, type TableAction, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { AppAction } from '../../../shared/ui/app-action';
import { Identity, Section } from '../../../shared/ui/page';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { contactBody, contactFields, contactFormValues } from '../client-forms';
import { clientBrands, clientsApi, type ClientDetail, type Contact } from '../clients-api';
import { clientKeys } from '../clients-queries';

export function ContactsSection({ client }: { client: ClientDetail }) { const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const invalidate = [clientKeys.detail(client.id), clientKeys.brands(client.id)];
  const archived = client.status === 'ARCHIVED';
  const brands = useMemo(() => clientBrands(client), [client]);
  const brandName = useMemo(() => new Map(brands.map((brand) => [brand.id, brand.name])), [brands]);
  const groupName = useMemo(() => new Map(client.groups.map((group) => [group.id, group.name])), [client.groups]);

  const create = useApiMutation(
    (body: ReturnType<typeof contactBody>) => clientsApi.createContact(client.id, body),
    { success: 'Kontak ditambahkan', invalidate, toastErrors: false },
  );
  const update = useApiMutation(
    (input: { contactId: string; body: ReturnType<typeof contactBody> }) =>
      clientsApi.updateContact(client.id, input.contactId, input.body),
    { success: 'Kontak tersimpan', invalidate, toastErrors: false },
  );
  const remove = useApiMutation((contact: Contact) => clientsApi.deleteContact(client.id, contact.id), { success: 'Kontak dihapus',
    invalidate,
    toastErrors: false });

  const columns: TableColumn<Contact>[] = [
    { key: 'name', label: 'Nama', render: (contact) => <Identity primary={contact.name} secondary={contact.position} /> },
    { key: 'email', label: 'Email', render: (contact) => contact.email ?? '—' },
    { key: 'phone', label: 'Telepon', render: (contact) => contact.phone ?? '—' },
    { key: 'brand_id',
      label: 'Berlaku untuk',
      render: (contact) =>
        contact.brand_id
          ? brandName.get(contact.brand_id) ?? 'Brand'
          : contact.group_id
            ? `Group: ${groupName.get(contact.group_id) ?? 'group'}`
            : 'Client' },
    { key: 'is_primary',
      label: 'Peran',
      render: (contact) => (
        <span className="app-page-actions">
          {contact.is_primary ? <DBadge variant="outline">Utama</DBadge> : null}
          {contact.is_billing ? <DBadge variant="outline">Penagihan</DBadge> : null}
          {contact.is_technical ? <DBadge variant="outline">Teknis</DBadge> : null}
          {contact.is_pic ? <DBadge variant="outline">PIC</DBadge> : null}
          {!contact.is_primary && !contact.is_billing && !contact.is_technical && !contact.is_pic ? '—' : null}
        </span>
      ) },
  ];

  const canManage = can(PERMISSIONS.CLIENTS_MANAGE) && !archived;
  const actions: TableAction<Contact>[] = canManage
    ? [
        { label: 'Edit', onClick: setEditing },
        { label: 'Hapus', variant: 'danger', show: (contact) => !contact.is_primary, onClick: setDeleting },
      ]
    : [];
  const createFields = useMemo(() => contactFields(brands, client.groups), [brands, client.groups]);
  const editFields = useMemo(() => contactFields(brands, client.groups, editing ?? undefined), [brands, client.groups, editing]);

  return (
    <>
      <Section
        title="Kontak client"
        actions={ canManage ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
              Tambah kontak
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={columns}
          data={client.contacts}
          rowKey="id"
          actions={actions.length ? actions : undefined}
          emptyMessage="Belum ada kontak. Tambahkan orang yang Digvation hubungi untuk client ini."
        />
      </Section>
      <FormDialog
        open={creating}
        title="Tambah kontak"
        fields={createFields}
        initialValues={contactFormValues()}
        submitLabel="Tambah kontak"
        onSubmit={(values) => create.mutateAsync(contactBody(values))}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title="Edit kontak"
        fields={editFields}
        initialValues={contactFormValues(editing ?? undefined)}
        submitLabel="Simpan kontak"
        onSubmit={(values) => update.mutateAsync({ contactId: editing!.id, body: contactBody(values) })}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Hapus kontak"
        message={`${deleting?.name ?? ''} hilang dari client ini. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={() => remove.mutateAsync(deleting!)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
