import { DBadge, DDataTable, DStatusFilter, type TableColumn } from '@digvation/ui';
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
  { value: 'pending', label: 'Menunggu' },
  { value: 'accepted', label: 'Diterima' },
  { value: 'revoked', label: 'Dicabut' },
  { value: 'expired', label: 'Kedaluwarsa' },
];

const COLUMNS: TableColumn<Invitation>[] = [
  { key: 'email',
    label: 'Email',
    render: (invitation) => (
      <Identity primary={invitation.email} secondary={`Diundang oleh ${invitation.invited_by.fullname}`} />
    ) },
  { key: 'roles',
    label: 'Role',
    render: (invitation) => (
      <span className="app-page-actions">
        {invitation.roles.map((role) => (
          <DBadge key={role} variant="outline">
            {role}
          </DBadge>
        ))}
      </span>
    ) },
  { key: 'status', label: 'Status', render: (invitation) => <StatusBadge status={invitation.status.toUpperCase()} /> },
  { key: 'expires_at', label: 'Kedaluwarsa', render: (invitation) => formatInstant(invitation.expires_at) },
  { key: 'created_at', label: 'Dikirim', render: (invitation) => formatInstant(invitation.created_at) },
];

export function InvitationsPage() { const list = useListState();
  const invitations = useInvitations(list.query);
  const { can } = usePermissions();
  const canInvite = can(PERMISSIONS.USERS_INVITE);
  const roles = useRoles(canInvite && can(PERMISSIONS.ROLES_READ));
  const [inviting, setInviting] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);

  const invite = useApiMutation(accessApi.invite, { success: 'Undangan terkirim',
    invalidate: [accessKeys.all],
    toastErrors: false });
  const revoke = useApiMutation((invitation: Invitation) => accessApi.revokeInvitation(invitation.id), { success: 'Undangan dicabut',
    invalidate: [accessKeys.all],
    toastErrors: false });

  return (
    <Page>
      <PageHeader
        title="Undangan"
        description="Operator baru bergabung lewat undangan. Tautan dalam email berlaku sampai masa kedaluwarsanya."
        actions={ canInvite ? (
            <AppAction icon={Plus} onClick={() => setInviting(true)}>
              Undang user
            </AppAction>
          ) : null
        }
      />
      <QueryState query={invitations} label="undangan">
        {(page) => (
          <DDataTable
            columns={COLUMNS}
            data={page.items}
            rowKey="id"
            searchable
            searchPlaceholder="Cari email"
            {...list.tableProps}
            filters={ <DStatusFilter
                label="Status"
                allLabel="Semua status"
                options={STATUS_OPTIONS}
                value={String(list.state.filters.status ?? 'ALL')}
                onChange={(status) => list.setFilter('status', status)}
              />
            }
            pagination={{ page: page.pagination.page, pageSize: page.pagination.limit, total: page.pagination.total }}
            actions={ canInvite
                ? [
                    { label: 'Cabut',
                      variant: 'danger',
                      show: (invitation) => invitation.status === 'pending',
                      onClick: setRevoking },
                  ]
                : undefined
            }
            emptyMessage="Belum ada undangan. Undang user untuk memberikan mereka akses."
          />
        )}
      </QueryState>

      <FormDialog
        open={inviting}
        title="Undang user"
        description="CORE mengirim tautan pendaftaran lewat email. Akun baru akan mendapat role yang dipilih di sini."
        fields={[
          { name: 'email', label: 'Email', kind: 'email', required: true, placeholder: 'name@digvation.id' },
          { name: 'role_slugs',
            label: 'Role',
            kind: 'checklist',
            required: true,
            options: (roles.data ?? [])
              .filter((role) => role.is_active)
              .map((role) => ({ value: role.slug, label: role.name, description: role.description ?? undefined })) },
        ]}
        submitLabel="Kirim undangan"
        onSubmit={(values) =>
          invite.mutateAsync({ email: read.text(values, 'email').toLowerCase(),
            role_slugs: read.list(values, 'role_slugs') })
        }
        onClose={() => setInviting(false)}
      />

      <ConfirmDialog
        open={revoking !== null}
        title="Cabut undangan"
        message={`Tautan yang dikirim ke ${revoking?.email ?? ''} langsung tidak berlaku.`}
        confirmLabel="Cabut"
        onConfirm={() => revoke.mutateAsync(revoking!)}
        onClose={() => setRevoking(null)}
      />
    </Page>
  );
}
