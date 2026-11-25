import { DBadge, DConfirmDialog, DDataTable, DStatusFilter, type TableColumn } from '@digvation/ui';
import { AlertCircle, KeyRound, MoreHorizontal, Pencil, Plus, ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { AppAction } from '../../../shared/ui/app-action';
import { AppMenu, AppMenuItem, AppMenuSeparator } from '../../../shared/ui/app-menu';
import { Page, PageHeader } from '../../../shared/ui/page';
import { closeAndRefocus } from '../../../shared/ui/row-actions-focus';
import { PERMISSIONS } from '../../auth/permissions';
import { useAuth } from '../../auth/use-auth';
import { usePermissions } from '../../auth/use-permissions';
import { accessApi, type Role } from '../access-api';
import { accessKeys, usePermissionCatalog, useRoles } from '../access-queries';
import { CreateRoleDialog, EditRoleDialog, RolePermissionsDialog } from '../components/role-dialogs';
import { ALL_PERMISSIONS, customRoleLock, permissionsLock } from '../role-rules';
import { useRolesCopy } from '../roles-copy';
import './roles-page.css';

type StatusFilter = '' | 'active' | 'inactive';

export function RolesPage() {
  const copy = useRolesCopy();
  const roles = useRoles();
  const { can, roles: myRoles, permissions: myPermissions } = usePermissions();
  const { user: me } = useAuth();
  const actor = { id: me?.id, roles: myRoles, permissions: myPermissions };
  const catalog = usePermissionCatalog(can(PERMISSIONS.PERMISSIONS_READ));
  const canSetPermissions = can(PERMISSIONS.ROLES_PERMISSIONS_MANAGE);
  const canUpdate = can(PERMISSIONS.ROLES_UPDATE);
  const canDelete = can(PERMISSIONS.ROLES_DELETE);
  const [status, setStatus] = useState<StatusFilter>('');
  const [creating, setCreating] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<Role | null>(null);
  const [editingDetails, setEditingDetails] = useState<Role | null>(null);
  const [toggling, setToggling] = useState<Role | null>(null);
  // Keeps the last role while the confirm dialog closes, so its text does not jump.
  const [togglingRole, setTogglingRole] = useState<Role | null>(null);
  if (toggling && toggling !== togglingRole) setTogglingRole(toggling);

  // GET /roles is not paginated, so the status filter runs in the browser.
  const all = roles.data ?? [];
  const activeCount = all.filter((role) => role.is_active).length;
  const shown = status === '' ? all : all.filter((role) => role.is_active === (status === 'active'));
  const catalogSize = catalog.data?.length;

  const setActive = useApiMutation(
    (role: Role) => (role.is_active ? accessApi.deleteRole(role.id) : accessApi.updateRole(role.id, { is_active: true })),
    {
      success: (_, role) => (role.is_active ? copy.deactivated(role.name) : copy.reactivated(role.name)),
      invalidate: [accessKeys.all],
    },
  );

  const columns: TableColumn<Role>[] = [
    {
      key: 'name',
      label: copy.columns.role,
      render: (role) => (
        <span className={`roles-identity${role.is_active ? '' : ' roles-dim'}`}>
          <span className="roles-name">{role.name}</span>
          {role.description ? <span className="roles-description">{role.description}</span> : null}
        </span>
      ),
    },
    { key: 'slug', label: copy.columns.slug, render: (role) => <span className="roles-slug">{role.slug}</span> },
    { key: 'is_system', label: copy.columns.type, render: (role) => <DBadge>{role.is_system ? copy.system : copy.custom}</DBadge> },
    { key: 'user_count', label: copy.columns.users, align: 'right' },
    {
      key: 'permissions',
      label: copy.columns.permissions,
      render: (role) => (
        <span className="roles-muted">
          {role.permissions.includes(ALL_PERMISSIONS)
            ? copy.allPermissions
            : catalogSize !== undefined
              ? copy.ofCatalog(role.permissions.length, catalogSize)
              : role.permissions.length}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: copy.columns.status,
      render: (role) => (
        <DBadge variant={role.is_active ? 'success' : 'default'}>{role.is_active ? copy.active : copy.inactive}</DBadge>
      ),
    },
  ];

  const rowActions = (role: Role) => {
    const permissionLock = permissionsLock(role, actor, copy.locks);
    const customLock = role.is_system ? undefined : customRoleLock(role, actor, copy.locks);
    const showDetails = !role.is_system && canUpdate;
    const showLifecycle = !role.is_system && (role.is_active ? canDelete : canUpdate);
    if (!canSetPermissions && !showDetails && !showLifecycle) return null;
    return (
      <AppMenu
        label={copy.actionsFor(role.name)}
        trigger={({ open, ref }) => (
          <button
            ref={ref}
            type="button"
            className="roles-row-action"
            data-row-actions={role.id}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={copy.actionsFor(role.name)}
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
        )}
      >
        {canSetPermissions ? (
          <AppMenuItem
            disabled={Boolean(permissionLock)}
            hint={permissionLock}
            icon={<KeyRound size={16} aria-hidden="true" />}
            onSelect={() => setEditingPermissions(role)}
          >
            {copy.setPermissions}
          </AppMenuItem>
        ) : null}
        {showDetails ? (
          <AppMenuItem
            disabled={Boolean(customLock)}
            hint={customLock}
            icon={<Pencil size={16} aria-hidden="true" />}
            onSelect={() => setEditingDetails(role)}
          >
            {copy.editDetails}
          </AppMenuItem>
        ) : null}
        {showLifecycle && (canSetPermissions || showDetails) ? <AppMenuSeparator /> : null}
        {showLifecycle ? (
          <AppMenuItem
            danger={role.is_active && !customLock}
            disabled={Boolean(customLock)}
            hint={customLock}
            icon={role.is_active ? <ShieldOff size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
            onSelect={() => setToggling(role)}
          >
            {role.is_active ? copy.deactivate : copy.reactivate}
          </AppMenuItem>
        ) : null}
      </AppMenu>
    );
  };

  const anyActions = canSetPermissions || canUpdate || canDelete;
  const empty = roles.isError ? (
    <div className="roles-state" role="alert">
      <span className="roles-state-icon">
        <AlertCircle size={20} aria-hidden="true" />
      </span>
      <b>{copy.loadFailed[0]}</b>
      <p>{copy.loadFailed[1]}</p>
      <AppAction tone="secondary" loading={roles.isFetching} onClick={() => void roles.refetch()}>
        {copy.retry}
      </AppAction>
    </div>
  ) : undefined;

  return (
    <Page>
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          can(PERMISSIONS.ROLES_CREATE) ? (
            <AppAction icon={Plus} onClick={() => setCreating(true)}>
              {copy.create}
            </AppAction>
          ) : null
        }
      />
      <section className="roles-table app-table-caps" aria-label={copy.title}>
        <DDataTable
          columns={columns}
          data={roles.isError ? [] : shown}
          rowKey="id"
          loading={roles.isPending}
          headerActions={
            roles.data ? (
              <div className="roles-toolbar">
                <div role="group" aria-label={copy.statusLabel}>
                <DStatusFilter
                  allLabel={
                    <>
                      {copy.all}
                      <span className="roles-filter-count">{all.length}</span>
                    </>
                  }
                  // Counts go in the labels: DStatusFilter's own count adds brackets the design does not use.
                  options={[
                    {
                      value: 'active',
                      label: (
                        <>
                          {copy.active}
                          <span className="roles-filter-count">{activeCount}</span>
                        </>
                      ),
                    },
                    {
                      value: 'inactive',
                      label: (
                        <>
                          {copy.inactive}
                          <span className="roles-filter-count">{all.length - activeCount}</span>
                        </>
                      ),
                    },
                  ]}
                  value={status}
                  onChange={(value) => setStatus(value as StatusFilter)}
                />
                </div>
                <span className="roles-meta">{copy.count(shown.length)}</span>
              </div>
            ) : null
          }
          actions={anyActions ? rowActions : undefined}
          emptyMessage={empty}
        />
      </section>

      <CreateRoleDialog
        open={creating}
        actor={actor}
        canManagePermissions={canSetPermissions}
        onClose={() => setCreating(false)}
      />
      <RolePermissionsDialog
        role={editingPermissions}
        actor={actor}
        onClose={() => closeAndRefocus(editingPermissions?.id, () => setEditingPermissions(null))}
      />
      <EditRoleDialog
        role={editingDetails}
        onClose={() => closeAndRefocus(editingDetails?.id, () => setEditingDetails(null))}
      />
      <DConfirmDialog
        open={toggling !== null}
        onClose={() => closeAndRefocus(togglingRole?.id, () => setToggling(null))}
        onConfirm={() => {
          if (!togglingRole) return;
          setActive.mutate(togglingRole, {
            onSettled: () => closeAndRefocus(togglingRole.id, () => setToggling(null)),
          });
        }}
        loading={setActive.isPending}
        variant={togglingRole?.is_active ? 'danger' : 'primary'}
        title={
          togglingRole
            ? togglingRole.is_active
              ? copy.deactivateTitle(togglingRole.name)
              : copy.reactivateTitle(togglingRole.name)
            : ''
        }
        message={
          togglingRole
            ? togglingRole.is_active
              ? copy.deactivateMessage(togglingRole.user_count)
              : copy.reactivateMessage
            : ''
        }
        confirmLabel={togglingRole?.is_active ? copy.deactivate : copy.reactivate}
        cancelLabel={copy.cancel}
      />
    </Page>
  );
}
