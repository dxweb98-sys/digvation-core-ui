import { DBadge, DDataTable, DEmptyState, DStatusFilter, type TableColumn } from '@digvation/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { ConfirmDialog, FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { Identity, Page, PageHeader, QueryState } from '../../../shared/ui/page';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { useListState } from '../../../shared/ui/use-list-state';
import { PERMISSIONS } from '../../auth/permissions';
import { usePermissions } from '../../auth/use-permissions';
import { accessApi, type Invitation } from '../access-api';
import { accessKeys, useInvitations, useRoles } from '../access-queries';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
];

const COLUMNS: TableColumn<Invitation>[] = [
  {
    key: 'email',
    label: 'Email',
    render: (invitation) => (
      <Identity primary={invitation.email} secondary={`Invited by ${invitation.invited_by.fullname}`} />
    ),
  },
  {
    key: 'roles',
    label: 'Roles',
    render: (invitation) => (
      <span className="app-page-actions">
        {invitation.roles.map((role) => (
          <DBadge key={role} variant="outline">
            {role}
          </DBadge>
        ))}
      </span>
    ),
  },
  { key: 'status', label: 'Status', render: (invitation) => <StatusBadge status={invitation.status.toUpperCase()} /> },
  { key: 'expires_at', label: 'Expires', render: (invitation) => formatInstant(invitation.expires_at) },
  { key: 'created_at', label: 'Sent', render: (invitation) => formatInstant(invitation.created_at) },
];

export function InvitationsPage() {
  const list = useListState();
  const invitations = useInvitations(list.query);
  const { can } = usePermissions();
  const canInvite = can(PERMISSIONS.USERS_INVITE);
  const roles = useRoles(canInvite && can(PERMISSIONS.ROLES_READ));
  const [inviting, setInviting] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);

  const invite = useApiMutation(accessApi.invite, {
    success: 'Invitation sent',
    invalidate: [accessKeys.all],
    toastErrors: false,
  });
  const revoke = useApiMutation((invitation: Invitation) => accessApi.revokeInvitation(invitation.id), {
    success: 'Invitation revoked',
    invalidate: [accessKeys.all],
    toastErrors: false,
  });

  return (
    <Page>
      <PageHeader
        title="Invitations"
        description="New operators join by invitation. The link in the email is valid until it expires."
        actions={
          canInvite ? (
            <AppAction icon={Plus} onClick={() => setInviting(true)}>
              Invite user
            </AppAction>
          ) : null
        }
      />
      <QueryState query={invitations} label="invitations">
        {(page) => (
          <DDataTable
            columns={COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Search email"
            {...list.tableProps}
            filters={
              <DStatusFilter
                label="Status"
                allLabel="All statuses"
                options={STATUS_OPTIONS}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            actions={
              canInvite
                ? [
                    {
                      label: 'Revoke',
                      variant: 'danger',
                      show: (invitation) => invitation.status === 'pending',
                      onClick: setRevoking,
                    },
                  ]
                : undefined
            }
            emptyMessage={<DEmptyState title="No invitations" description="Invite a user to give them access." />}
          />
        )}
      </QueryState>

      <FormDialog
        open={inviting}
        title="Invite user"
        description="CORE emails a sign-up link. The account gets the roles you choose here."
        fields={[
          { name: 'email', label: 'Email', kind: 'email', required: true, placeholder: 'name@digvation.id' },
          {
            name: 'role_slugs',
            label: 'Roles',
            kind: 'checklist',
            required: true,
            options: (roles.data ?? [])
              .filter((role) => role.is_active)
              .map((role) => ({ value: role.slug, label: role.name, description: role.description ?? undefined })),
          },
        ]}
        submitLabel="Send invitation"
        onSubmit={(values) =>
          invite.mutateAsync({
            email: read.text(values, 'email').toLowerCase(),
            role_slugs: read.list(values, 'role_slugs'),
          })
        }
        onClose={() => setInviting(false)}
      />

      <ConfirmDialog
        open={revoking !== null}
        title="Revoke invitation"
        message={`The link sent to ${revoking?.email ?? ''} stops working at once.`}
        confirmLabel="Revoke"
        onConfirm={() => revoke.mutateAsync(revoking!)}
        onClose={() => setRevoking(null)}
      />
    </Page>
  );
}
