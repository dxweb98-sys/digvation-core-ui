import { DBadge, DDataTable, type TableColumn } from '@digvation/ui';
import { AlertCircle, MoreHorizontal, Plus, Search, Shield, UserCheck, UserX } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { calendarDateOf, formatBusinessDate } from '../../../shared/format/date';
import { AppAction } from '../../../shared/ui/app-action';
import { AppMenu, AppMenuItem, AppMenuSeparator } from '../../../shared/ui/app-menu';
import { Page, PageHeader } from '../../../shared/ui/page';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { useAuth } from '../../auth/use-auth';
import { usePermissions } from '../../auth/use-permissions';
import { type User } from '../access-api';
import { usePendingInvitationCount, useRoles, useUsers } from '../access-queries';
import { ChangeRolesDialog } from '../components/change-roles-dialog';
import { InviteUserDialog } from '../components/invite-user-dialog';
import { UserStatusDialog } from '../components/user-status-dialog';
import { changeRolesBlock, deactivateBlock } from '../user-rules';
import { useUsersCopy } from '../users-copy';
import './users-page.css';

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

function StateBlock({
  icon,
  title,
  body,
  action,
  danger = false,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className={`users-state${danger ? ' users-state-danger' : ''}`} role={danger ? 'alert' : undefined}>
      <span className="users-state-icon">{icon}</span>
      <b>{title}</b>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function UsersPage() {
  const copy = useUsersCopy();
  const list = useListState();
  const users = useUsers(list.query);
  const { can, roles: myRoles, permissions: myPermissions } = usePermissions();
  const { user: me } = useAuth();
  const actor = { id: me?.id, roles: myRoles, permissions: myPermissions };
  const canInvite = can(PERMISSIONS.USERS_INVITE);
  const canManageRoles = can(PERMISSIONS.USERS_ROLES_MANAGE);
  const canLifecycle = can(PERMISSIONS.USERS_LIFECYCLE_MANAGE);
  const roles = useRoles(can(PERMISSIONS.ROLES_READ));
  const pending = usePendingInvitationCount(canInvite);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);

  // The user payload carries role slugs; the operator sees the role name.
  const roleName = new Map((roles.data ?? []).map((role) => [role.slug, role.name]));

  // Focus goes back to the row's ⋯ button when a dialog closes. DDataTable renders
  // the row twice (desktop table and mobile card), so the visible button is used.
  const closeAndRefocus = (user: User | null, close: () => void) => {
    close();
    if (!user) return;
    requestAnimationFrame(() =>
      [...document.querySelectorAll<HTMLElement>(`[data-row-actions="${user.id}"]`)]
        .find((button) => button.offsetParent !== null)
        ?.focus(),
    );
  };

  const columns: TableColumn<User>[] = [
    {
      key: 'fullname',
      label: copy.columns.user,
      render: (user) => (
        <span className={`users-identity${user.is_active ? '' : ' users-dim'}`}>
          <span className="users-avatar" aria-hidden="true">
            {initials(user.fullname)}
          </span>
          <span className="users-two">
            <span className="users-name">
              {user.fullname}
              {user.id === me?.id ? <span className="users-you">{copy.you}</span> : null}
            </span>
            <span className="users-muted users-small">{user.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'username', label: copy.columns.username, render: (user) => <span className="users-muted">{user.username}</span> },
    {
      key: 'roles',
      label: copy.columns.roles,
      render: (user) =>
        user.roles.length ? (
          <span className="users-roles">
            {user.roles.map((slug) => (
              <DBadge key={slug}>{roleName.get(slug) ?? slug}</DBadge>
            ))}
          </span>
        ) : (
          <span className="users-muted">{copy.noRole}</span>
        ),
    },
    {
      key: 'is_active',
      label: copy.columns.status,
      render: (user) => (
        <span className="users-two users-status">
          <DBadge variant={user.is_active ? 'success' : 'default'}>{user.is_active ? copy.active : copy.inactive}</DBadge>
          {user.email_verified_at ? null : <span className="users-muted users-small">{copy.emailUnverified}</span>}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: copy.columns.created,
      render: (user) => <span className="users-muted">{formatBusinessDate(calendarDateOf(user.created_at))}</span>,
    },
  ];

  const rowActions = (user: User) => {
    const blocked = user.is_active ? deactivateBlock(user, actor, copy) : undefined;
    const rolesBlocked = changeRolesBlock(user, actor, roles.data ?? [], copy);
    return (
      <AppMenu
        label={copy.actionsFor(user.fullname)}
        trigger={({ open, ref }) => (
          <button
            ref={ref}
            type="button"
            className="users-row-action"
            data-row-actions={user.id}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={copy.actionsFor(user.fullname)}
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
        )}
      >
        {canManageRoles ? (
          <AppMenuItem
            disabled={Boolean(rolesBlocked)}
            hint={rolesBlocked}
            icon={<Shield size={16} aria-hidden="true" />}
            onSelect={() => setEditing(user)}
          >
            {copy.changeRoles}
          </AppMenuItem>
        ) : null}
        {canManageRoles && canLifecycle ? <AppMenuSeparator /> : null}
        {canLifecycle ? (
          user.is_active ? (
            <AppMenuItem
              danger={!blocked}
              disabled={Boolean(blocked)}
              hint={blocked}
              icon={<UserX size={16} aria-hidden="true" />}
              onSelect={() => setStatusTarget(user)}
            >
              {copy.deactivate}
            </AppMenuItem>
          ) : (
            <AppMenuItem icon={<UserCheck size={16} aria-hidden="true" />} onSelect={() => setStatusTarget(user)}>
              {copy.reactivate}
            </AppMenuItem>
          )
        ) : null}
      </AppMenu>
    );
  };

  const page = users.data;
  const searching = Boolean(list.state.search.trim());
  const empty = users.isError ? (
    <StateBlock
      danger
      icon={<AlertCircle size={20} aria-hidden="true" />}
      title={copy.loadFailed[0]}
      body={copy.loadFailed[1]}
      action={
        <AppAction tone="secondary" loading={users.isFetching} onClick={() => void users.refetch()}>
          {copy.retry}
        </AppAction>
      }
    />
  ) : searching ? (
    <StateBlock
      icon={<Search size={20} aria-hidden="true" />}
      title={copy.noMatch[0]}
      body={copy.noMatch[1]}
      action={
        <AppAction tone="secondary" onClick={() => list.setSearch('')}>
          {copy.clearSearch}
        </AppAction>
      }
    />
  ) : undefined;

  return (
    <Page>
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          canInvite ? (
            <AppAction icon={Plus} onClick={() => setInviting(true)}>
              {copy.invite}
            </AppAction>
          ) : null
        }
      />
      <section className="users-table" aria-label={copy.title}>
        <DDataTable
          columns={columns}
          data={users.isError ? [] : (page?.items ?? [])}
          rowKey="id"
          loading={users.isPending}
          searchable
          searchPlaceholder={copy.search}
          {...list.tableProps}
          headerActions={
            page ? (
              <span className="users-meta">
                {copy.total(page.pagination.total)}
                {canInvite && pending > 0 ? (
                  <>
                    {' · '}
                    <Link to="/invitations">{copy.pending(pending)}</Link>
                  </>
                ) : null}
              </span>
            ) : null
          }
          pagination={
            page && !users.isError
              ? { page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }
              : undefined
          }
          actions={canManageRoles || canLifecycle ? rowActions : undefined}
          emptyMessage={empty}
        />
      </section>

      <InviteUserDialog open={inviting} onClose={() => setInviting(false)} />
      <UserStatusDialog user={statusTarget} onClose={() => closeAndRefocus(statusTarget, () => setStatusTarget(null))} />
      <ChangeRolesDialog
        user={editing}
        actor={actor}
        onClose={() => closeAndRefocus(editing, () => setEditing(null))}
      />
    </Page>
  );
}
