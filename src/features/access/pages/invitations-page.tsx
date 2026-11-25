import { DBadge, DConfirmDialog, DDataTable, DSelectFilter, useToast, type TableColumn } from '@digvation/ui';
import { AlertCircle, Mail, MoreHorizontal, Search, Shield, Users, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { isApiError } from '../../../shared/api/api-error';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { AppAction } from '../../../shared/ui/app-action';
import { AppMenu, AppMenuItem } from '../../../shared/ui/app-menu';
import { Page, PageHeader } from '../../../shared/ui/page';
import { closeAndRefocus } from '../../../shared/ui/row-actions-focus';
import { StateBlock } from '../../../shared/ui/state-block';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS, SUPER_ADMIN_ROLE } from '../../auth/permissions';
import { useAuth } from '../../auth/use-auth';
import { usePermissions } from '../../auth/use-permissions';
import { accessApi, type Invitation, type User } from '../access-api';
import { accessKeys, useInvitations } from '../access-queries';
import { ChangeRolesDialog } from '../components/change-roles-dialog';
import { InviteUserDialog } from '../components/invite-user-dialog';
import { useInvitationsCopy } from '../invitations-copy';
import { validityText } from '../invitation-rules';
import './users-page.css';
import './invitations-page.css';

type Status = Invitation['status'];
const STATUSES: Status[] = ['pending', 'accepted', 'expired', 'revoked'];
const BADGE: Record<Status, 'warning' | 'success' | 'default'> = {
  pending: 'warning',
  accepted: 'success',
  expired: 'default',
  revoked: 'default',
};
export function InvitationsPage() {
  const copy = useInvitationsCopy();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const list = useListState();
  const invitations = useInvitations(list.query);
  const { can, roles: myRoles, permissions: myPermissions } = usePermissions();
  const { user: me } = useAuth();
  const actor = { id: me?.id, roles: myRoles, permissions: myPermissions };
  const canInvite = can(PERMISSIONS.USERS_INVITE);
  const canManageRoles = can(PERMISSIONS.USERS_ROLES_MANAGE);
  const canReadUsers = can(PERMISSIONS.USERS_READ);
  const superAdmin = myRoles.includes(SUPER_ADMIN_ROLE);

  const [inviting, setInviting] = useState<{ email: string; rowId?: string } | null>(null);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const [roleTarget, setRoleTarget] = useState<{ user: User; rowId: string } | null>(null);

  const status = list.state.filters.status as Status | undefined;
  const filtered = Boolean(list.state.search.trim() || status);

  const revoke = useApiMutation((invitation: Invitation) => accessApi.revokeInvitation(invitation.id), {
    success: (_, invitation) => copy.revokeDialog.done(invitation.email),
    invalidate: [accessKeys.all],
    toastErrors: false,
  });

  function confirmRevoke() {
    const target = revoking;
    if (!target) return;
    revoke.mutate(target, {
      onError: (cause) => {
        const code = isApiError(cause) ? cause.code : undefined;
        showToast({
          title: (code && copy.revokeDialog.errors[code]) || friendlyErrorMessage(cause),
          variant: 'danger',
        });
        void invitations.refetch();
      },
      onSettled: () => closeAndRefocus(target.id, () => setRevoking(null)),
    });
  }

  async function giveRoles(invitation: Invitation) {
    if (!invitation.accepted_user_id) return;
    try {
      const user = await accessApi.user(invitation.accepted_user_id);
      setRoleTarget({ user, rowId: invitation.id });
    } catch {
      showToast({ title: copy.userLoadFailed, variant: 'danger' });
    }
  }

  const columns: TableColumn<Invitation>[] = [
    {
      key: 'email',
      label: copy.columns.email,
      render: (invitation) => (
        <span className={`users-identity${invitation.status === 'expired' || invitation.status === 'revoked' ? ' inv-dim' : ''}`}>
          <span className="users-avatar" aria-hidden="true">
            <Mail size={14} />
          </span>
          <span className="users-two">
            <span className="users-name">{invitation.email}</span>
            <span className="users-muted users-small inv-card-only">{copy.invitedBy(invitation.invited_by.fullname)}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      label: copy.columns.status,
      render: (invitation) => <DBadge variant={BADGE[invitation.status]}>{copy.status[invitation.status]}</DBadge>,
    },
    {
      key: 'invited_by',
      label: copy.columns.invitedBy,
      render: (invitation) => <span className="users-muted inv-invited-by">{invitation.invited_by.fullname}</span>,
    },
    {
      key: 'expires_at',
      label: copy.columns.validity,
      render: (invitation) => {
        const [main, sub] = validityText(invitation, copy);
        return (
          <span className="users-two inv-validity">
            <span>{main}</span>
            {sub ? <span className="users-muted users-small">{sub}</span> : null}
          </span>
        );
      },
    },
  ];

  const rowActions = (invitation: Invitation) => {
    const items =
      invitation.status === 'pending'
        ? [
            <AppMenuItem key="revoke" danger icon={<XCircle size={16} aria-hidden="true" />} onSelect={() => setRevoking(invitation)}>
              {copy.revoke}
            </AppMenuItem>,
          ]
        : invitation.status === 'accepted'
          ? [
              canManageRoles && invitation.accepted_user_id ? (
                <AppMenuItem key="roles" icon={<Shield size={16} aria-hidden="true" />} onSelect={() => void giveRoles(invitation)}>
                  {copy.giveRoles}
                </AppMenuItem>
              ) : null,
              canReadUsers ? (
                <AppMenuItem
                  key="users"
                  icon={<Users size={16} aria-hidden="true" />}
                  onSelect={() => navigate(`/users?search=${encodeURIComponent(invitation.email)}`)}
                >
                  {copy.viewInUsers}
                </AppMenuItem>
              ) : null,
            ].filter(Boolean)
          : [
              <AppMenuItem
                key="again"
                icon={<Mail size={16} aria-hidden="true" />}
                onSelect={() => setInviting({ email: invitation.email, rowId: invitation.id })}
              >
                {copy.resend}
              </AppMenuItem>,
            ];
    if (!items.length) return null;
    return (
      <AppMenu
        label={copy.actionsFor(invitation.email)}
        trigger={({ open, ref }) => (
          <button
            ref={ref}
            type="button"
            className="users-row-action"
            data-row-actions={invitation.id}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={copy.actionsFor(invitation.email)}
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
        )}
      >
        {items}
      </AppMenu>
    );
  };

  const page = invitations.data;
  const neverInvited = !invitations.isError && page && page.pagination.total === 0 && !filtered;

  const emptyState = invitations.isError ? (
    <StateBlock
      danger
      icon={<AlertCircle size={20} aria-hidden="true" />}
      title={copy.loadFailed[0]}
      body={copy.loadFailed[1]}
      action={
        <AppAction tone="secondary" loading={invitations.isFetching} onClick={() => void invitations.refetch()}>
          {copy.retry}
        </AppAction>
      }
    />
  ) : filtered ? (
    <StateBlock
      icon={<Search size={20} aria-hidden="true" />}
      title={copy.noMatch[0]}
      body={copy.noMatch[1]}
      action={
        <AppAction
          tone="secondary"
          onClick={() => {
            list.setSearch('');
            list.setFilter('status', 'ALL');
          }}
        >
          {copy.clearFilters}
        </AppAction>
      }
    />
  ) : undefined;

  const openUsers = canReadUsers ? (
    <AppAction tone="secondary" onClick={() => navigate('/users')}>
      {copy.openUsers}
    </AppAction>
  ) : null;

  return (
    <Page>
      <PageHeader
        title={copy.title}
        description={
          superAdmin ? (
            copy.description
          ) : (
            <>
              {copy.description}
              <span className="inv-own-only">{copy.ownOnly}</span>
            </>
          )
        }
      />
      {neverInvited ? (
        <section className="app-state-card" aria-label={copy.title}>
          <StateBlock icon={<Mail size={20} aria-hidden="true" />} title={copy.empty[0]} body={copy.empty[1]} action={openUsers} />
        </section>
      ) : (
        <section className="users-table inv-table app-table-caps" aria-label={copy.title}>
          <DDataTable
            columns={columns}
            data={invitations.isError ? [] : (page?.items ?? [])}
            rowKey="id"
            loading={invitations.isPending}
            searchable
            searchPlaceholder={copy.search}
            {...list.tableProps}
            filters={
              <DSelectFilter
                label={copy.statusLabel}
                options={[
                  { value: 'ALL', label: copy.all },
                  ...STATUSES.map((value) => ({ value, label: copy.status[value] })),
                ]}
                value={status ?? 'ALL'}
                onChange={(value) => list.setFilter('status', value ? String(value) : 'ALL')}
              />
            }
            headerActions={
              page ? (
                <span className="users-meta">
                  {copy.total(page.pagination.total)}
                  {status ? copy.activeFilter(copy.statusLabel, copy.status[status]) : null}
                </span>
              ) : null
            }
            pagination={
              page && !invitations.isError
                ? { page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }
                : undefined
            }
            actions={canInvite ? rowActions : undefined}
            emptyMessage={emptyState}
          />
        </section>
      )}

      <InviteUserDialog
        open={inviting !== null}
        email={inviting?.email}
        onClose={() => closeAndRefocus(inviting?.rowId, () => setInviting(null))}
      />

      <DConfirmDialog
        open={revoking !== null}
        onClose={() => closeAndRefocus(revoking?.id, () => setRevoking(null))}
        onConfirm={confirmRevoke}
        loading={revoke.isPending}
        variant="danger"
        title={copy.revokeDialog.title}
        message={revoking ? copy.revokeDialog.message(revoking.email) : ''}
        confirmLabel={copy.revokeDialog.confirm}
        cancelLabel={copy.revokeDialog.cancel}
      />

      <ChangeRolesDialog
        user={roleTarget?.user ?? null}
        actor={actor}
        onClose={() => closeAndRefocus(roleTarget?.rowId, () => setRoleTarget(null))}
      />
    </Page>
  );
}
