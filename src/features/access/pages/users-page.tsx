import { DBadge, DDataTable, DEmptyState, type TableAction, type TableColumn } from '@digvation/ui';
import { useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { Identity, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { useAuth } from '../../auth/use-auth';
import { usePermissions } from '../../auth/use-permissions';
import { accessApi, type User } from '../access-api';
import { accessKeys, useRoles, useUsers } from '../access-queries';

const COLUMNS: TableColumn<User>[] = [
  {
    key: 'fullname',
    label: 'User',
    render: (user) => <Identity primary={user.fullname} secondary={user.email} />,
  },
  { key: 'username', label: 'Username' },
  {
    key: 'roles',
    label: 'Roles',
    render: (user) =>
      user.roles.length ? (
        <span className="app-page-actions">
          {user.roles.map((role) => (
            <DBadge key={role} variant="outline">
              {role}
            </DBadge>
          ))}
        </span>
      ) : (
        'No roles'
      ),
  },
  {
    key: 'is_active',
    label: 'Status',
    render: (user) => <StatusBadge status={user.is_active ? 'ACTIVE' : 'INACTIVE'} />,
  },
  { key: 'created_at', label: 'Created', render: (user) => formatInstant(user.created_at) },
];

export function UsersPage() {
  const list = useListState();
  const users = useUsers(list.query);
  const { can } = usePermissions();
  const { user: me } = useAuth();
  const canManageRoles = can(PERMISSIONS.USERS_ROLES_MANAGE);
  const roles = useRoles(canManageRoles && can(PERMISSIONS.ROLES_READ));
  const [editing, setEditing] = useState<User | null>(null);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);

  const setRoles = useApiMutation(
    (input: { userId: string; roles: string[] }) =>
      accessApi.setUserRoles(input.userId, { role_slugs: input.roles }),
    { success: 'Roles saved', invalidate: [accessKeys.all], toastErrors: false },
  );
  const setStatus = useApiMutation(
    (input: { user: User; reason: string }) =>
      accessApi.setUserStatus(input.user.id, { is_active: !input.user.is_active, reason: input.reason }),
    {
      success: (_, input) => (input.user.is_active ? 'User deactivated' : 'User reactivated'),
      invalidate: [accessKeys.all],
      toastErrors: false,
    },
  );

  const actions: TableAction<User>[] = [
    ...(canManageRoles ? [{ label: 'Edit roles', onClick: setEditing }] : []),
    ...(can(PERMISSIONS.USERS_LIFECYCLE_MANAGE)
      ? [
          {
            label: 'Deactivate',
            variant: 'danger' as const,
            show: (user: User) => user.is_active && user.id !== me?.id,
            onClick: setStatusTarget,
          },
          { label: 'Reactivate', show: (user: User) => !user.is_active, onClick: setStatusTarget },
        ]
      : []),
  ];

  const roleOptions = (roles.data ?? [])
    .filter((role) => role.is_active)
    .map((role) => ({ value: role.slug, label: role.name, description: role.description ?? undefined }));

  return (
    <Page>
      <PageHeader title="Users" description="Operator accounts and the roles that decide what they can do." />
      <QueryState query={users} label="users">
        {(page) => (
          <DDataTable
            columns={COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Search name, email, or username"
            {...list.tableProps}
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            actions={actions.length ? actions : undefined}
            emptyMessage={<DEmptyState title="No users found" description="Try another search, or invite someone." />}
          />
        )}
      </QueryState>

      <FormDialog
        open={editing !== null}
        title={`Roles for ${editing?.fullname ?? ''}`}
        description="The user gets every permission of the roles you choose. Their open sessions pick the change up on the next request."
        fields={[{ name: 'role_slugs', label: 'Roles', kind: 'checklist', options: roleOptions }]}
        initialValues={{ role_slugs: editing?.roles ?? [] }}
        submitLabel="Save roles"
        onSubmit={(values) => setRoles.mutateAsync({ userId: editing!.id, roles: read.list(values, 'role_slugs') })}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.is_active ? 'Deactivate user' : 'Reactivate user'}
        message={
          statusTarget?.is_active
            ? `${statusTarget.fullname} is signed out everywhere at once and cannot sign in until reactivated.`
            : `${statusTarget?.fullname ?? ''} can sign in again with their existing roles.`
        }
        confirmLabel={statusTarget?.is_active ? 'Deactivate' : 'Reactivate'}
        tone={statusTarget?.is_active ? 'danger' : 'primary'}
        reason={{ label: 'Reason' }}
        onConfirm={(values) => setStatus.mutateAsync({ user: statusTarget!, reason: read.text(values, 'reason') })}
        onClose={() => setStatusTarget(null)}
      />
    </Page>
  );
}
