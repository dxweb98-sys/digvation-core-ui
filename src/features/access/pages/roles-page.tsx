import { DDataTable, type TableAction, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read, type FieldSpec } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { Code, Identity, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { accessApi, type PermissionItem, type Role } from '../access-api';
import { accessKeys, usePermissionCatalog, useRoles } from '../access-queries';

const COLUMNS: TableColumn<Role>[] = [
  { key: 'name', label: 'Role', render: (role) => <Identity primary={role.name} secondary={role.description} /> },
  { key: 'slug', label: 'Code', render: (role) => <Code>{role.slug}</Code> },
  { key: 'is_system', label: 'Tipe', render: (role) => (role.is_system ? 'Sistem' : 'Kustom') },
  { key: 'user_count', label: 'User', align: 'right' },
  { key: 'permissions', label: 'Permission', align: 'right', render: (role) => role.permissions.length },
  { key: 'is_active', label: 'Status', render: (role) => <StatusBadge status={role.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
];

const IDENTITY_FIELDS: FieldSpec[] = [
  { name: 'name', label: 'Nama', required: true, maxLength: 100, placeholder: 'Manajer operasional' },
  { name: 'description', label: 'Deskripsi', kind: 'textarea', maxLength: 255 },
];

const CREATE_FIELDS: FieldSpec[] = [
  IDENTITY_FIELDS[0],
  { name: 'slug',
    label: 'Code',
    required: true,
    maxLength: 100,
    placeholder: 'OPERATIONS_MANAGER',
    hint: 'Huruf kapital dengan garis bawah. Tidak bisa diubah nanti.' },
  IDENTITY_FIELDS[1],
];

function permissionOptions(catalog: readonly PermissionItem[]) { return [...catalog]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((permission) => ({ value: permission.slug,
      label: permission.name,
      description: permission.description ?? permission.slug }));
}

export function RolesPage() { const roles = useRoles();
  const { can } = usePermissions();
  const canEditPermissions = can(PERMISSIONS.ROLES_PERMISSIONS_MANAGE);
  const catalog = usePermissionCatalog(canEditPermissions && can(PERMISSIONS.PERMISSIONS_READ));
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [permissionsFor, setPermissionsFor] = useState<Role | null>(null);
  const [statusTarget, setStatusTarget] = useState<Role | null>(null);
  const invalidate = [accessKeys.all];

  const create = useApiMutation(accessApi.createRole, { success: 'Role dibuat', invalidate, toastErrors: false });
  const update = useApiMutation(
    (input: { roleId: string; name: string; description: string | null }) =>
      accessApi.updateRole(input.roleId, { name: input.name, description: input.description }),
    { success: 'Role disimpan', invalidate, toastErrors: false },
  );
  const savePermissions = useApiMutation(
    (input: { roleId: string; slugs: string[] }) =>
      accessApi.setRolePermissions(input.roleId, { permission_slugs: input.slugs }),
    { success: 'Permission disimpan', invalidate, toastErrors: false },
  );
  const setActive = useApiMutation(
    (role: Role) => accessApi.updateRole(role.id, { is_active: !role.is_active }),
    { success: (_, role) => (role.is_active ? 'Role dinonaktifkan' : 'Role diaktifkan kembali'),
      invalidate,
      toastErrors: false },
  );

  const actions: TableAction<Role>[] = [
    ...(can(PERMISSIONS.ROLES_UPDATE)
      ? [{ label: 'Edit', show: (role: Role) => !role.is_system, onClick: setEditing }]
      : []),
    ...(canEditPermissions
      ? [{ label: 'Permission', show: (role: Role) => role.slug !== 'SUPER_ADMIN', onClick: setPermissionsFor }]
      : []),
    ...(can(PERMISSIONS.ROLES_UPDATE)
      ? [
          { label: 'Nonaktifkan', variant: 'danger' as const, show: (role: Role) => !role.is_system && role.is_active, onClick: setStatusTarget },
          { label: 'Aktifkan kembali', show: (role: Role) => !role.is_system && !role.is_active, onClick: setStatusTarget },
        ]
      : []),
  ];

  return (
    <Page>
      <PageHeader
        title="Role"
        description="Role adalah sekumpulan permission dengan satu nama. Role sistem tetap; role kustom bisa diubah."
        actions={ can(PERMISSIONS.ROLES_CREATE) ? (
            <AppAction icon={Plus} onClick={() => setCreating(true)}>
              Tambah role
            </AppAction>
          ) : null
        }
      />
      <QueryState query={roles} label="role">
        {(items) => (
          <DDataTable
            columns={COLUMNS}
            data={items}
            rowKey="id"
            actions={actions.length ? actions : undefined}
            emptyMessage="Belum ada role. Tambah role untuk mengelompokkan permission."
          />
        )}
      </QueryState>

      <FormDialog
        open={creating}
        title="Tambah role"
        fields={CREATE_FIELDS}
        submitLabel="Tambah role"
        onSubmit={(values) =>
          create.mutateAsync({ name: read.text(values, 'name'),
            slug: read.text(values, 'slug').toUpperCase(),
            description: read.omit(values, 'description'),
            permission_slugs: [] })
        }
        onClose={() => setCreating(false)}
      />

      <FormDialog
        open={editing !== null}
        title="Edit role"
        fields={IDENTITY_FIELDS}
        initialValues={{ name: editing?.name ?? '', description: editing?.description ?? '' }}
        submitLabel="Simpan role"
        onSubmit={(values) =>
          update.mutateAsync({ roleId: editing!.id,
            name: read.text(values, 'name'),
            description: read.optional(values, 'description') })
        }
        onClose={() => setEditing(null)}
      />

      <FormDialog
        open={permissionsFor !== null}
        kind="wide"
        title={`Permission untuk ${permissionsFor?.name ?? ''}`}
        description="Setiap user dengan role ini mendapat persis permission yang dipilih."
        fields={[
          { name: 'permission_slugs',
            label: 'Permission',
            kind: 'checklist',
            options: permissionOptions(catalog.data ?? []),
            hint: catalog.isPending ? 'Memuat katalog permission…' : undefined },
        ]}
        initialValues={{ permission_slugs: permissionsFor?.permissions ?? [] }}
        submitLabel="Simpan permission"
        onSubmit={(values) =>
          savePermissions.mutateAsync({ roleId: permissionsFor!.id, slugs: read.list(values, 'permission_slugs') })
        }
        onClose={() => setPermissionsFor(null)}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.is_active ? 'Nonaktifkan role' : 'Aktifkan kembali role'}
        message={ statusTarget?.is_active
            ? `User dengan role ${statusTarget.name} kehilangan permission-nya sampai role diaktifkan kembali.`
            : `User dengan role ${statusTarget?.name ?? ''} mendapat permission-nya kembali.`
        }
        confirmLabel={statusTarget?.is_active ? 'Nonaktifkan' : 'Aktifkan kembali'}
        tone={statusTarget?.is_active ? 'danger' : 'primary'}
        onConfirm={() => setActive.mutateAsync(statusTarget!)}
        onClose={() => setStatusTarget(null)}
      />
    </Page>
  );
}
