import { DDataTable, DEmptyState, type TableAction, type TableColumn } from '@digvation/ui';
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
  { key: 'is_system', label: 'Type', render: (role) => (role.is_system ? 'System' : 'Custom') },
  { key: 'user_count', label: 'Users', align: 'right' },
  { key: 'permissions', label: 'Permissions', align: 'right', render: (role) => role.permissions.length },
  { key: 'is_active', label: 'Status', render: (role) => <StatusBadge status={role.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
];

const IDENTITY_FIELDS: FieldSpec[] = [
  { name: 'name', label: 'Name', required: true, maxLength: 100, placeholder: 'Operations manager' },
  { name: 'description', label: 'Description', kind: 'textarea', maxLength: 255 },
];

const CREATE_FIELDS: FieldSpec[] = [
  IDENTITY_FIELDS[0],
  {
    name: 'slug',
    label: 'Code',
    required: true,
    maxLength: 100,
    placeholder: 'OPERATIONS_MANAGER',
    hint: 'Uppercase with underscores. It cannot be changed later.',
  },
  IDENTITY_FIELDS[1],
];

function permissionOptions(catalog: readonly PermissionItem[]) {
  return [...catalog]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((permission) => ({
      value: permission.slug,
      label: permission.name,
      description: permission.description ?? permission.slug,
    }));
}

export function RolesPage() {
  const roles = useRoles();
  const { can } = usePermissions();
  const canEditPermissions = can(PERMISSIONS.ROLES_PERMISSIONS_MANAGE);
  const catalog = usePermissionCatalog(canEditPermissions && can(PERMISSIONS.PERMISSIONS_READ));
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [permissionsFor, setPermissionsFor] = useState<Role | null>(null);
  const [statusTarget, setStatusTarget] = useState<Role | null>(null);
  const invalidate = [accessKeys.all];

  const create = useApiMutation(accessApi.createRole, { success: 'Role created', invalidate, toastErrors: false });
  const update = useApiMutation(
    (input: { roleId: string; name: string; description: string | null }) =>
      accessApi.updateRole(input.roleId, { name: input.name, description: input.description }),
    { success: 'Role saved', invalidate, toastErrors: false },
  );
  const savePermissions = useApiMutation(
    (input: { roleId: string; slugs: string[] }) =>
      accessApi.setRolePermissions(input.roleId, { permission_slugs: input.slugs }),
    { success: 'Permissions saved', invalidate, toastErrors: false },
  );
  const setActive = useApiMutation(
    (role: Role) => accessApi.updateRole(role.id, { is_active: !role.is_active }),
    {
      success: (_, role) => (role.is_active ? 'Role deactivated' : 'Role reactivated'),
      invalidate,
      toastErrors: false,
    },
  );

  const actions: TableAction<Role>[] = [
    ...(can(PERMISSIONS.ROLES_UPDATE)
      ? [{ label: 'Edit', show: (role: Role) => !role.is_system, onClick: setEditing }]
      : []),
    ...(canEditPermissions
      ? [{ label: 'Permissions', show: (role: Role) => role.slug !== 'SUPER_ADMIN', onClick: setPermissionsFor }]
      : []),
    ...(can(PERMISSIONS.ROLES_UPDATE)
      ? [
          { label: 'Deactivate', variant: 'danger' as const, show: (role: Role) => !role.is_system && role.is_active, onClick: setStatusTarget },
          { label: 'Reactivate', show: (role: Role) => !role.is_system && !role.is_active, onClick: setStatusTarget },
        ]
      : []),
  ];

  return (
    <Page>
      <PageHeader
        title="Roles"
        description="A role is a named set of permissions. System roles are fixed; custom roles can be edited."
        actions={
          can(PERMISSIONS.ROLES_CREATE) ? (
            <AppAction icon={Plus} onClick={() => setCreating(true)}>
              Add role
            </AppAction>
          ) : null
        }
      />
      <QueryState query={roles} label="roles">
        {(items) => (
          <DDataTable
            columns={COLUMNS}
            data={items}
            rowKey="id"
            actions={actions.length ? actions : undefined}
            emptyMessage={<DEmptyState title="No roles yet" description="Add a role to group permissions." />}
          />
        )}
      </QueryState>

      <FormDialog
        open={creating}
        title="Add role"
        fields={CREATE_FIELDS}
        submitLabel="Add role"
        onSubmit={(values) =>
          create.mutateAsync({
            name: read.text(values, 'name'),
            slug: read.text(values, 'slug').toUpperCase(),
            description: read.omit(values, 'description'),
            permission_slugs: [],
          })
        }
        onClose={() => setCreating(false)}
      />

      <FormDialog
        open={editing !== null}
        title="Edit role"
        fields={IDENTITY_FIELDS}
        initialValues={{ name: editing?.name ?? '', description: editing?.description ?? '' }}
        submitLabel="Save role"
        onSubmit={(values) =>
          update.mutateAsync({
            roleId: editing!.id,
            name: read.text(values, 'name'),
            description: read.optional(values, 'description'),
          })
        }
        onClose={() => setEditing(null)}
      />

      <FormDialog
        open={permissionsFor !== null}
        kind="wide"
        title={`Permissions of ${permissionsFor?.name ?? ''}`}
        description="Every user with this role gets exactly these permissions."
        fields={[
          {
            name: 'permission_slugs',
            label: 'Permissions',
            kind: 'checklist',
            options: permissionOptions(catalog.data ?? []),
            hint: catalog.isPending ? 'Loading the permission catalog…' : undefined,
          },
        ]}
        initialValues={{ permission_slugs: permissionsFor?.permissions ?? [] }}
        submitLabel="Save permissions"
        onSubmit={(values) =>
          savePermissions.mutateAsync({ roleId: permissionsFor!.id, slugs: read.list(values, 'permission_slugs') })
        }
        onClose={() => setPermissionsFor(null)}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.is_active ? 'Deactivate role' : 'Reactivate role'}
        message={
          statusTarget?.is_active
            ? `Users with ${statusTarget.name} lose its permissions until it is reactivated.`
            : `Users with ${statusTarget?.name ?? ''} get its permissions back.`
        }
        confirmLabel={statusTarget?.is_active ? 'Deactivate' : 'Reactivate'}
        tone={statusTarget?.is_active ? 'danger' : 'primary'}
        onConfirm={() => setActive.mutateAsync(statusTarget!)}
        onClose={() => setStatusTarget(null)}
      />
    </Page>
  );
}
