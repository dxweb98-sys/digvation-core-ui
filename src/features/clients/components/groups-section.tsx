import { DDataTable, type TableAction, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { AppAction } from '../../../shared/ui/app-action';
import { Identity, Section } from '../../../shared/ui/page';
import { valueOrNotSet } from '../../../shared/ui/not-set';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { groupBody, groupFields, groupFormValues } from '../client-forms';
import { clientsApi, type ClientDetail, type ClientGroup } from '../clients-api';
import { clientKeys } from '../clients-queries';

/** Groups of a client: the layer that gives many brands one bill-to and one PIC. */
export function GroupsSection({ client }: { client: ClientDetail }) { const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClientGroup | null>(null);
  const [deleting, setDeleting] = useState<ClientGroup | null>(null);
  const invalidate = [clientKeys.detail(client.id), clientKeys.brands(client.id)];
  const readonly = client.status === 'ARCHIVED';
  const canManage = can(PERMISSIONS.CLIENTS_MANAGE) && !readonly;
  const fields = groupFields(client.legal_entities);

  const create = useApiMutation(
    (body: ReturnType<typeof groupBody>) => clientsApi.createGroup(client.id, body),
    { success: 'Group ditambahkan', invalidate, toastErrors: false },
  );
  const update = useApiMutation(
    (input: { groupId: string; body: ReturnType<typeof groupBody> }) =>
      clientsApi.updateGroup(client.id, input.groupId, input.body),
    { success: 'Group tersimpan', invalidate, toastErrors: false },
  );
  const remove = useApiMutation(
    (group: ClientGroup) => clientsApi.deleteGroup(client.id, group.id),
    { success: 'Group dihapus', invalidate, toastErrors: false },
  );

  const entityName = new Map(client.legal_entities.map((entity) => [entity.id, entity.name]));

  const columns: TableColumn<ClientGroup>[] = [
    { key: 'name', label: 'Group', render: (group) => <Identity primary={group.name} secondary={group.notes} /> },
    { key: 'brands',
      label: 'Brand',
      render: (group) =>
        group.brands.length === 0 ? (
          <span className="not-set">Belum ada brand</span>
        ) : (
          <span className="app-page-actions">
            {group.brands.map((brand) => (
              <Link key={brand.id} to={`/clients/${client.id}/brands/${brand.id}`}>
                {brand.name}
              </Link>
            ))}
          </span>
        ) },
    { key: 'default_legal_entity_id',
      label: 'Legal entity default',
      width: '240px',
      render: (group) =>
        valueOrNotSet(group.default_legal_entity_id ? entityName.get(group.default_legal_entity_id) : null) },
  ];

  const actions: TableAction<ClientGroup>[] = [];
  if (canManage) { actions.push({ label: 'Edit', onClick: setEditing });
    // CORE only deletes an empty group, so the action appears once the brands have moved out.
    actions.push({ label: 'Hapus', variant: 'danger', show: (group) => group.brands.length === 0, onClick: setDeleting });
  }

  return (
    <>
      <Section
        title="Group brand"
        actions={ canManage ? (
            <AppAction icon={Plus} tone="secondary" size="sm" onClick={() => setCreating(true)}>
              Tambah group
            </AppAction>
          ) : null
        }
      >
        <DDataTable
          columns={columns}
          data={client.groups}
          rowKey="id"
          actions={actions.length ? actions : undefined}
          emptyMessage="Belum ada group. Group dipakai untuk menagih dan menentukan PIC beberapa brand sekaligus. Group juga bisa dimulai dari sebuah brand."
        />
      </Section>

      <FormDialog
        open={creating}
        title="Tambah group"
        description="Group dibuat tanpa brand. Pindahkan brand ke group ini dari tab Brands."
        fields={fields}
        initialValues={groupFormValues()}
        submitLabel="Tambah group"
        onSubmit={(values) => create.mutateAsync(groupBody(values))}
        onClose={() => setCreating(false)}
      />
      <FormDialog
        open={editing !== null}
        title="Edit group"
        description={editing?.name}
        fields={fields}
        initialValues={groupFormValues(editing ?? undefined)}
        submitLabel="Simpan group"
        onSubmit={(values) => update.mutateAsync({ groupId: editing!.id, body: groupBody(values) })}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={`Hapus group ${deleting?.name ?? ''}`}
        message="Group ini tidak punya brand sehingga bisa dihapus. Riwayat brand dan invoice tidak berubah."
        confirmLabel="Hapus"
        onConfirm={() => remove.mutateAsync(deleting!)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
