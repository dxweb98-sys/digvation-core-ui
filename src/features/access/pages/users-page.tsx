import { DBadge, DDataTable, type TableAction, type TableColumn } from '@digvation/ui';
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

const columns = (roleName: (slug: string) => string): TableColumn<User>[] => [
  { key: 'fullname',
    label: 'User',
    render: (user) => <Identity primary={user.fullname} secondary={user.email} /> },
  { key: 'username', label: 'Username' },
  { key: 'roles',
    label: 'Role',
    render: (user) =>
      user.roles.length ? (
        <span className="app-page-actions">
          {user.roles.map((role) => (
            <DBadge key={role} variant="outline">
              {roleName(role)}
            </DBadge>
          ))}
        </span>
      ) : (
        'Tidak ada role'
      ) },
  { key: 'is_active',
    label: 'Status',
    render: (user) => <StatusBadge status={user.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
  { key: 'created_at', label: 'Dibuat', render: (user) => formatInstant(user.created_at) },
];

export function UsersPage() { const list = useListState();
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
    { success: 'Role disimpan', invalidate: [accessKeys.all], toastErrors: false },
  );
  const setStatus = useApiMutation(
    (input: { user: User; reason: string }) =>
      accessApi.setUserStatus(input.user.id, { is_active: !input.user.is_active, reason: input.reason }),
    { success: (_, input) => (input.user.is_active ? 'User dinonaktifkan' : 'User diaktifkan kembali'),
      invalidate: [accessKeys.all],
      toastErrors: false },
  );

  const actions: TableAction<User>[] = [
    ...(canManageRoles ? [{ label: 'Edit role', onClick: setEditing }] : []),
    ...(can(PERMISSIONS.USERS_LIFECYCLE_MANAGE)
      ? [
          { label: 'Nonaktifkan',
            variant: 'danger' as const,
            show: (user: User) => user.is_active && user.id !== me?.id,
            onClick: setStatusTarget },
          { label: 'Aktifkan kembali', show: (user: User) => !user.is_active, onClick: setStatusTarget },
        ]
      : []),
  ];

  const roleOptions = (roles.data ?? [])
    .filter((role) => role.is_active)
    .map((role) => ({ value: role.slug, label: role.name, description: role.description ?? undefined }));

  // The user payload carries role slugs; the operator sees the role name.
  const roleName = new Map((roles.data ?? []).map((role) => [role.slug, role.name]));
  const userColumns = columns((slug) => roleName.get(slug) ?? slug);

  return (
    <Page>
      <PageHeader title="User" description="Akun operator beserta role yang menentukan apa yang bisa mereka lakukan." />
      <QueryState query={users} label="user">
        {(page) => (
          <DDataTable
            columns={userColumns}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Cari nama, email, atau username"
            {...list.tableProps}
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            actions={actions.length ? actions : undefined}
            emptyMessage="User tidak ditemukan. Coba kata lain, atau undang user."
          />
        )}
      </QueryState>

      <FormDialog
        open={editing !== null}
        title={`Role untuk ${editing?.fullname ?? ''}`}
        description="User mendapat seluruh permission dari role yang dipilih. Sesi yang sedang terbuka akan memakai perubahan ini pada permintaan berikutnya."
        fields={[{ name: 'role_slugs', label: 'Role', kind: 'checklist', options: roleOptions }]}
        initialValues={{ role_slugs: editing?.roles ?? [] }}
        submitLabel="Simpan role"
        onSubmit={(values) => setRoles.mutateAsync({ userId: editing!.id, roles: read.list(values, 'role_slugs') })}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.is_active ? 'Nonaktifkan user' : 'Aktifkan kembali user'}
        message={ statusTarget?.is_active
            ? `${statusTarget.fullname} akan keluar dari semua sesi sekaligus dan tidak bisa masuk lagi sampai diaktifkan kembali.`
            : `${statusTarget?.fullname ?? ''} bisa masuk kembali dengan role yang sudah dimilikinya.`
        }
        confirmLabel={statusTarget?.is_active ? 'Nonaktifkan' : 'Aktifkan kembali'}
        tone={statusTarget?.is_active ? 'danger' : 'primary'}
        reason={{ label: 'Alasan' }}
        onConfirm={(values) => setStatus.mutateAsync({ user: statusTarget!, reason: read.text(values, 'reason') })}
        onClose={() => setStatusTarget(null)}
      />
    </Page>
  );
}
