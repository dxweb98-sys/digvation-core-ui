import { DButton, DDropdown, DConfirmDialog, DConnectionError, DDataTable, DEmptyState, DLoadingIndicator, DStatusFilter, useToast, type TableColumn } from '@digvation/ui';
import { useState, type ReactNode } from 'react';
import { useAccessAudit, useAccessInvitations, useAccessRoles, useAccessUsers, useRevokeInvitation } from '../hooks/use-access';
import { AuditDetailDialog, InvitationFormDialog, RoleDialog, UserDetailDialog } from '../components/access-dialogs';
import { formatAccessDate, type AccessInvitation, type AccessRole, type AccessUser, type AuditEntry } from '../types/access';
import '../access.css';

function AccessPage({ title, children }: { title: string; children: ReactNode }) {
  return <div className="access-page"><div><p className="page-eyebrow">Internal operator access</p><h1>{title}</h1></div>{children}</div>;
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
    { key: 'name', label: 'Name', render: user => <div className="access-id"><strong>{user.name}</strong><span>{user.email}</span></div> },
    { key: 'status', label: 'Status' }, { key: 'roles', label: 'Roles', render: user => roleNames(user) || 'No roles' },
    { key: 'lastActivityAt', label: 'Last activity', render: user => user.lastActivityAt ? formatAccessDate(user.lastActivityAt) : 'Never' },
    { key: 'updatedAt', label: 'Updated', render: user => formatAccessDate(user.updatedAt) },
  ];
  return <AccessPage title="Users">{users.isPending || roles.isPending || users.isError || roles.isError ? <AccessQueryState queries={[users, roles]} /> : <>
    <DDataTable {...list.table} columns={columns} rowKey="id" searchPlaceholder="Search users or roles" filters={<DStatusFilter label="Status" value={list.status} onChange={list.changeStatus} options={['ACTIVE', 'INACTIVE'].map(value => ({ value, label: value }))} />} actions={user => <DDropdown closeOnItemClick trigger={() => <DButton variant="outline" aria-label="Actions">⋯</DButton>}><DButton variant="ghost" onClick={() => setSelectedId(user.id)}>View User Detail</DButton></DDropdown>} />
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
  const roleName = (invitation: AccessInvitation) => roles.data?.find(role => role.id === invitation.roleId)?.name ?? invitation.roleId;
  const list = useAccessList(invitations.data ?? [], invitation => `${invitation.email} ${roleName(invitation)} ${invitation.invitedBy}`, (invitation, status) => status === 'ALL' || invitation.status === status);
  const columns: TableColumn<AccessInvitation>[] = [
    { key: 'email', label: 'Email' }, { key: 'roleId', label: 'Assigned role', render: roleName }, { key: 'status', label: 'Status' }, { key: 'invitedBy', label: 'Invited by' },
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
    <DDataTable {...list.table} columns={columns} rowKey="id" searchPlaceholder="Search invitations" headerActions={<DButton onClick={() => setCreating(true)}>Create Invitation</DButton>}
      filters={<DStatusFilter label="Status" value={list.status} onChange={list.changeStatus} options={['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'].map(value => ({ value, label: value }))} />}
      actions={invitation => invitation.status === 'PENDING' ? <DDropdown closeOnItemClick trigger={() => <DButton variant="outline" aria-label="Actions">⋯</DButton>}><DButton variant="ghost" onClick={() => setSelected(invitation)}>Revoke invitation</DButton></DDropdown> : null} />
    {creating && <InvitationFormDialog roles={roles.data ?? []} onClose={() => setCreating(false)} />}
    {selected && <DConfirmDialog open title="Revoke invitation?" message={selected.email} confirmLabel="Revoke invitation" variant="danger" loading={revoke.isPending} onClose={() => { if (!revoke.isPending) setSelected(null); }} onConfirm={() => void revokeSelected()} />}
  </>}</AccessPage>;
}

const ROLE_COLUMNS: TableColumn<AccessRole>[] = [
  { key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }, { key: 'permissions', label: 'Permissions', render: role => role.permissions.length },
  { key: 'updatedAt', label: 'Updated', render: role => formatAccessDate(role.updatedAt) },
];
export function RolesPage() {
  const roles = useAccessRoles();
  const [selected, setSelected] = useState<AccessRole | 'new' | null>(null);
  const list = useAccessList(roles.data ?? [], role => `${role.name} ${role.description} ${role.permissions.join(' ')}`);
  return <AccessPage title="Roles">{roles.isPending || roles.isError ? <AccessQueryState queries={[roles]} /> : <>
    <DDataTable {...list.table} columns={ROLE_COLUMNS} rowKey="id" searchPlaceholder="Search roles or permissions" headerActions={<DButton onClick={() => setSelected('new')}>Create Role</DButton>} actions={role => <DDropdown closeOnItemClick trigger={() => <DButton variant="outline" aria-label="Actions">⋯</DButton>}><DButton variant="ghost" onClick={() => setSelected(role)}>View Role</DButton></DDropdown>} />
    {selected && <RoleDialog role={selected === 'new' ? undefined : selected} onClose={() => setSelected(null)} />}
  </>}</AccessPage>;
}

const AUDIT_COLUMNS: TableColumn<AuditEntry>[] = [
  { key: 'timestamp', label: 'Time', render: entry => formatAccessDate(entry.timestamp) }, { key: 'actor', label: 'Actor' }, { key: 'action', label: 'Action' },
  { key: 'target', label: 'Domain / Target', render: entry => `${entry.domain} · ${entry.target}` }, { key: 'result', label: 'Result' }, { key: 'reason', label: 'Reason / Summary', render: entry => entry.reason ?? '—' },
];
export function AuditPage() {
  const audit = useAccessAudit();
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [result, setResult] = useState('ALL');
  const list = useAccessList((audit.data ?? []).filter(entry => result === 'ALL' || entry.result === result), entry => `${entry.actor} ${entry.action} ${entry.target} ${entry.reason ?? ''}`, (entry, domain) => domain === 'ALL' || entry.domain === domain);
  return <AccessPage title="Audit">{audit.isPending || audit.isError ? <AccessQueryState queries={[audit]} /> : <>
    <DDataTable {...list.table} columns={AUDIT_COLUMNS} rowKey="id" searchPlaceholder="Search actor, action or target" filters={<>
      <DStatusFilter label="Domain" value={list.status} onChange={list.changeStatus} options={[...new Set(audit.data?.map(entry => entry.domain))].map(value => ({ value, label: value }))} />
      <DStatusFilter label="Result" value={result} onChange={value => { setResult(value); list.table.onPageChange(1); }} options={['SUCCESS', 'REVOKED'].map(value => ({ value, label: value }))} />
    </>} actions={entry => <DDropdown closeOnItemClick trigger={() => <DButton variant="outline" aria-label="Actions">⋯</DButton>}><DButton variant="ghost" onClick={() => setSelected(entry)}>View audit detail</DButton></DDropdown>} />
    {selected && <AuditDetailDialog entry={selected} onClose={() => setSelected(null)} />}
  </>}</AccessPage>;
}
