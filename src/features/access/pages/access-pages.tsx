import { RecordButton } from '../../../shared/ui/record-button';
import { isCoreMode } from '../../../shared/data/data-availability';
import { valueOrNotSet } from '../../../shared/ui/not-set';
import { labelFor } from '../../../shared/labels/labels';
import { MoreHorizontal, Plus } from 'lucide-react';
import { AppAction, AppIconAction } from '../../../shared/ui/app-action';
import { DDropdown, DConfirmDialog, DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, DStatusFilter, useToast, type TableColumn } from '@digvation/ui';
import { useState, type ReactNode } from 'react';
import { useAccessAudit, useAccessInvitations, useAccessRoles, useAccessUsers, useRevokeInvitation } from '../hooks/use-access';
import { AuditDetailDialog, InvitationFormDialog, RoleDialog, UserDetailDialog } from '../components/access-dialogs';
import { ALL_PERMISSIONS, formatAccessDate, type AccessInvitation, type AccessRole, type AccessUser, type AuditEntry } from '../types/access';
import { AccessAuditPage } from './access-audit-page';
import '../access.css';

function AccessPage({ title, children }: { title: string; children: ReactNode }) {
  return <div className="access-page"><div><h1>{title}</h1></div>{children}</div>;
}

type QueryState = { isPending: boolean; isError: boolean; error: Error | null; refetch: () => unknown };
function AccessQueryState({ queries }: { queries: QueryState[] }) {
  const failed = queries.find(query => query.isError);
  if (failed) return <DConnectionError title="Access data unavailable" message="Access records could not be loaded." detail={failed.error?.message} onRetry={() => { queries.forEach(query => { void query.refetch(); }); }} />;
  return <DLoadingIndicator label="Loading access records" />;
}

function useAccessList<T>(records: T[], searchableText: (record: T) => string, filter: (record: T, status: string) => boolean = () => true) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = records.filter(record => searchableText(record).toLowerCase().includes(search.trim().toLowerCase()) && filter(record, status));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  return {
    status,
    changeStatus: (value: string) => { setStatus(value); setPage(1); },
    table: {
      data: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      searchable: true,
      searchValue: search,
      onSearchChange: (value: string) => { setSearch(value); setPage(1); },
      pagination: { page: currentPage, pageSize, total: filtered.length },
      onPageChange: setPage,
      onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); },
      emptyMessage: <DEmptyState title="No matching records" description="Try another search or filter." />,
    },
  };
}

export function UsersPage() {
  const users = useAccessUsers();
  const roles = useAccessRoles();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const roleNames = (user: AccessUser) => user.roleIds.map(id => roles.data?.find(role => role.id === id)?.name ?? id).join(', ');
  const list = useAccessList(users.data ?? [], user => `${user.name} ${user.email} ${roleNames(user)}`, (user, status) => status === 'ALL' || user.status === status);
  const selected = users.data?.find(user => user.id === selectedId);
  const columns: TableColumn<AccessUser>[] = [
    { key: 'name', label: 'Name', render: user => <div className="access-id"><RecordButton><strong>{user.name}</strong></RecordButton><span>{user.email}</span></div> },
    { key: 'status', label: 'Status', render: user => labelFor(user.status) }, { key: 'roles', label: 'Roles', render: user => roleNames(user) || 'No roles' },
    ...(isCoreMode() ? [] : [{ key: 'lastActivityAt', label: 'Last activity', render: (user: AccessUser) => user.lastActivityAt ? formatAccessDate(user.lastActivityAt) : 'Never' }]),
    { key: 'updatedAt', label: 'Updated', render: user => formatAccessDate(user.updatedAt) },
  ];
  return <AccessPage title="Users">{users.isPending || roles.isPending || users.isError || roles.isError ? <AccessQueryState queries={[users, roles]} /> : <>
    <DDataTable {...list.table} columns={columns} rowKey="id" onRowClick={user => setSelectedId(user.id)} searchPlaceholder="Search users or roles" filters={<DStatusFilter label="Status" value={list.status} onChange={list.changeStatus} options={['ACTIVE', 'INACTIVE'].map(value => ({ value, label: value }))} />} actions={user => <DDropdown closeOnItemClick placement="bottom-end" minWidth={140} contentClassName="access-row-menu" trigger={() => <AppIconAction icon={MoreHorizontal} tone="secondary" label="Actions" />}><AppAction tone="tertiary" size="sm" onClick={() => setSelectedId(user.id)}>View</AppAction></DDropdown>} />
    {selected && <UserDetailDialog key={selected.id} user={selected} roles={roles.data ?? []} onClose={() => setSelectedId(null)} />}
  </>}</AccessPage>;
}

export function InvitationsPage() {
  const invitations = useAccessInvitations();
  const roles = useAccessRoles();
  const revoke = useRevokeInvitation();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<AccessInvitation | null>(null);
  const roleName = (invitation: AccessInvitation) => (invitation.roleIds ?? [invitation.roleId]).map(id => roles.data?.find(role => role.id === id)?.name ?? id).join(', ');
  const list = useAccessList(invitations.data ?? [], invitation => `${invitation.email} ${roleName(invitation)} ${invitation.invitedBy}`, (invitation, status) => status === 'ALL' || invitation.status === status);
  const columns: TableColumn<AccessInvitation>[] = [
    { key: 'email', label: 'Email' }, { key: 'roleId', label: 'Assigned role', render: roleName }, { key: 'status', label: 'Status', render: invitation => labelFor(invitation.status) }, { key: 'invitedBy', label: 'Invited by' },
    { key: 'createdAt', label: 'Created', render: invitation => formatAccessDate(invitation.createdAt) }, { key: 'expiresAt', label: 'Expires', render: invitation => formatAccessDate(invitation.expiresAt) },
  ];
  async function revokeSelected() {
    if (!selected) return;
    try {
      await revoke.mutateAsync(selected.id);
      showToast({ title: 'Invitation revoked', variant: 'success' });
      setSelected(null);
    } catch (error) { showToast({ title: 'Revoke failed', description: error instanceof Error ? error.message : 'Invitation could not be revoked.', variant: 'danger' }); }
  }
  return <AccessPage title="Invitations">{invitations.isPending || roles.isPending || invitations.isError || roles.isError ? <AccessQueryState queries={[invitations, roles]} /> : <>
    <DDataTable {...list.table} columns={columns} rowKey="id" searchPlaceholder="Search invitations" headerActions={<AppAction icon={Plus} tone="primary" onClick={() => setCreating(true)}>Create invitation</AppAction>}
      filters={<DStatusFilter label="Status" value={list.status} onChange={list.changeStatus} options={['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'].map(value => ({ value, label: value }))} />}
      actions={invitation => invitation.status === 'PENDING' ? <DDropdown closeOnItemClick placement="bottom-end" minWidth={140} contentClassName="access-row-menu" trigger={() => <AppIconAction icon={MoreHorizontal} tone="secondary" label="Actions" />}><AppAction tone="tertiary" size="sm" onClick={() => setSelected(invitation)}>Revoke</AppAction></DDropdown> : null} />
    {creating && <InvitationFormDialog roles={roles.data ?? []} onClose={() => setCreating(false)} />}
    {selected && <DConfirmDialog open title="Revoke invitation?" message={selected.email} confirmLabel="Revoke" variant="danger" loading={revoke.isPending} onClose={() => { if (!revoke.isPending) setSelected(null); }} onConfirm={() => void revokeSelected()} />}
  </>}</AccessPage>;
}

const ROLE_COLUMNS: TableColumn<AccessRole>[] = [
  { key: 'name', label: 'Name', render: role => <RecordButton><strong>{role.name}</strong></RecordButton> }, { key: 'description', label: 'Description' }, { key: 'permissions', label: 'Permissions', render: role => role.permissions.includes(ALL_PERMISSIONS) ? 'All' : role.permissions.length },
  { key: 'updatedAt', label: 'Updated', render: role => formatAccessDate(role.updatedAt) },
];
export function RolesPage() {
  const roles = useAccessRoles();
  const users = useAccessUsers();
  const [selected, setSelected] = useState<AccessRole | 'new' | null>(null);
  const list = useAccessList(roles.data ?? [], role => `${role.name} ${role.description} ${role.permissions.join(' ')}`);
  return <AccessPage title="Roles">{roles.isPending || roles.isError || users.isPending || users.isError ? <AccessQueryState queries={[roles, users]} /> : <>
    <DDataTable {...list.table} columns={ROLE_COLUMNS} rowKey="id" onRowClick={setSelected} searchPlaceholder="Search roles or permissions" headerActions={<AppAction icon={Plus} tone="primary" onClick={() => setSelected('new')}>Create role</AppAction>} actions={role => <DDropdown closeOnItemClick placement="bottom-end" minWidth={140} contentClassName="access-row-menu" trigger={() => <AppIconAction icon={MoreHorizontal} tone="secondary" label="Actions" />}><AppAction tone="tertiary" size="sm" onClick={() => setSelected(role)}>View</AppAction></DDropdown>} />
    {selected && <RoleDialog assignedUserCount={selected === 'new' ? 0 : (users.data ?? []).filter(user => user.roleIds.includes(selected.id)).length} role={selected === 'new' ? undefined : selected} onClose={() => setSelected(null)} />}
  </>}</AccessPage>;
}

const AUDIT_COLUMNS: TableColumn<AuditEntry>[] = [
  { key: 'timestamp', label: 'Time', render: entry => <RecordButton>{formatAccessDate(entry.timestamp)}</RecordButton> }, { key: 'actor', label: 'Actor' }, { key: 'action', label: 'Action' },
  { key: 'target', label: 'Target', render: entry => `${entry.domain} · ${entry.target}` }, { key: 'result', label: 'Result', render: entry => labelFor(entry.result) }, { key: 'reason', label: 'Reason', render: entry => valueOrNotSet(entry.reason) },
];
export function AuditPage() {
  return isCoreMode() ? <AccessAuditPage /> : <MockAuditPage />;
}

function MockAuditPage() {
  const audit = useAccessAudit();
  const roles = useAccessRoles();
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [result, setResult] = useState('ALL');
  const list = useAccessList((audit.data ?? []).filter(entry => result === 'ALL' || entry.result === result), entry => `${entry.actor} ${entry.action} ${entry.target} ${entry.reason ?? ''}`, (entry, domain) => domain === 'ALL' || entry.domain === domain);
  return <AccessPage title="Access audit">{audit.isPending || audit.isError || roles.isPending || roles.isError ? <AccessQueryState queries={[audit, roles]} /> : <>
    <DDataTable {...list.table} columns={AUDIT_COLUMNS} rowKey="id" onRowClick={setSelected} searchPlaceholder="Search actor, action or target" filters={<>
      <DStatusFilter label="Domain" value={list.status} onChange={list.changeStatus} options={[...new Set(audit.data?.map(entry => entry.domain))].map(value => ({ value, label: value }))} />
      <DStatusFilter label="Result" value={result} onChange={value => { setResult(value); list.table.onPageChange(1); }} options={['SUCCESS', 'REVOKED'].map(value => ({ value, label: value }))} />
    </>} actions={entry => <DDropdown closeOnItemClick placement="bottom-end" minWidth={140} contentClassName="access-row-menu" trigger={() => <AppIconAction icon={MoreHorizontal} tone="secondary" label="Actions" />}><AppAction tone="tertiary" size="sm" onClick={() => setSelected(entry)}>View</AppAction></DDropdown>} />
    {selected && <AuditDetailDialog roles={roles.data} entry={selected} onClose={() => setSelected(null)} />}
  </>}</AccessPage>;
}
