import { DButton, DCheckbox, DConfirmDialog, DDialog, DInput, DSelect, useToast } from '@digvation/ui';
import { useState } from 'react';
import { useCreateInvitation, useSaveRole, useUpdateUserRoles, useUserStatus } from '../hooks/use-access';
import { formatAccessDate, effectivePermissions, PERMISSIONS, type AccessRole, type AccessUser, type AuditEntry, type RoleInput } from '../types/access';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'The change could not be saved.';

export function UserDetailDialog({ user, roles, onClose }: { user: AccessUser; roles: AccessRole[]; onClose: () => void }) {
  const [roleIds, setRoleIds] = useState(user.roleIds);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const updateRoles = useUpdateUserRoles(user.id);
  const updateStatus = useUserStatus(user.id);
  const { showToast } = useToast();
  const busy = updateRoles.isPending || updateStatus.isPending;
  const capabilities = effectivePermissions(roleIds, roles);
  async function saveRoles() {
    try {
      await updateRoles.mutateAsync(roleIds);
      showToast({ title: 'User roles updated', variant: 'success' });
    } catch (error) { showToast({ title: 'Role update failed', description: errorMessage(error), variant: 'danger' }); }
  }
  async function changeStatus() {
    try {
      await updateStatus.mutateAsync(user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
      showToast({ title: 'User status updated', variant: 'success' });
      setConfirmStatus(false);
    } catch (error) { showToast({ title: 'Status update failed', description: errorMessage(error), variant: 'danger' }); }
  }
  return <>
    <DDialog open onClose={() => { if (!busy) onClose(); }} title={user.name} size="lg" footer={<div className="access-actions">
      <DButton variant="outline" disabled={busy} onClick={onClose}>Close</DButton>
      <DButton variant="outline" disabled={busy} onClick={() => setConfirmStatus(true)}>{user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</DButton>
      <DButton loading={updateRoles.isPending} disabled={busy} onClick={() => void saveRoles()}>Save roles</DButton>
    </div>}>
      <dl className="access-detail">
        <div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Status</dt><dd>{user.status}</dd></div>
        <div><dt>Created</dt><dd>{formatAccessDate(user.createdAt)}</dd></div><div><dt>Updated</dt><dd>{formatAccessDate(user.updatedAt)}</dd></div>
        <div><dt>Last activity</dt><dd>{user.lastActivityAt ? formatAccessDate(user.lastActivityAt) : 'Never'}</dd></div>
      </dl>
      <h2>Roles & Access</h2>
      <fieldset className="access-checks" disabled={busy}><legend>Assigned roles</legend>{roles.map(role => <label key={role.id}>
        <DCheckbox checked={roleIds.includes(role.id)} onChange={event => setRoleIds(current => event.target.checked ? [...current, role.id] : current.filter(id => id !== role.id))} />{role.name}
      </label>)}</fieldset>
      <h3>Effective capabilities</h3>
      <p>{user.status === 'INACTIVE' ? 'This user is inactive. Assigned roles are retained.' : 'Capabilities from the selected roles; save to apply changes.'}</p>
      <ul className="access-permissions">{capabilities.map(permission => <li key={permission}>{permission}</li>)}</ul>
      {!capabilities.length && <p>No permissions assigned.</p>}
    </DDialog>
    {confirmStatus && <DConfirmDialog open onClose={() => { if (!busy) setConfirmStatus(false); }} onConfirm={() => void changeStatus()} loading={updateStatus.isPending}
      title={`${user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${user.name}?`} message="This updates the internal operator record." confirmLabel="Confirm status change" variant={user.status === 'ACTIVE' ? 'danger' : 'primary'} />}
  </>;
}

export function InvitationFormDialog({ roles, onClose }: { roles: AccessRole[]; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [error, setError] = useState('');
  const mutation = useCreateInvitation();
  const { showToast } = useToast();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await mutation.mutateAsync({ email, roleId });
      showToast({ title: 'Invitation created', variant: 'success' });
      onClose();
    } catch (error) {
      setError(errorMessage(error));
      showToast({ title: 'Invitation failed', description: errorMessage(error), variant: 'danger' });
    }
  }
  return <DDialog open onClose={() => { if (!mutation.isPending) onClose(); }} title="Create invitation" description="Creates a mock invitation record. No email is sent." footer={<div className="access-actions">
    <DButton variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancel</DButton><DButton type="submit" form="access-invitation-form" loading={mutation.isPending} disabled={mutation.isPending || !roleId}>Create invitation</DButton>
  </div>}><form id="access-invitation-form" className="access-form" onSubmit={event => void submit(event)}>
    <DInput label="Email" type="email" value={email} onChange={setEmail} required disabled={mutation.isPending} />
    <DSelect label="Role" value={roleId} options={roles.map(role => ({ value: role.id, label: role.name }))} onValueChange={value => setRoleId(value as string)} disabled={mutation.isPending} />
    {!roles.length && <p>Create a role before inviting an operator.</p>}
    {error && <p role="alert">{error}</p>}
  </form></DDialog>;
}

export function RoleDialog({ role, onClose }: { role?: AccessRole; onClose: () => void }) {
  const [editing, setEditing] = useState(!role);
  const [input, setInput] = useState<RoleInput>({ name: role?.name ?? '', description: role?.description ?? '', permissions: role?.permissions ?? [] });
  const [error, setError] = useState('');
  const mutation = useSaveRole(role?.id);
  const { showToast } = useToast();
  const groups = [...new Set(PERMISSIONS.map(permission => permission.split('.')[0]))];
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await mutation.mutateAsync(input);
      showToast({ title: role ? 'Role updated' : 'Role created', variant: 'success' });
      onClose();
    } catch (error) {
      setError(errorMessage(error));
      showToast({ title: 'Role save failed', description: errorMessage(error), variant: 'danger' });
    }
  }
  return <DDialog open onClose={() => { if (!mutation.isPending) onClose(); }} title={role ? role.name : 'Create role'} size="lg" footer={<div className="access-actions">
    <DButton variant="outline" disabled={mutation.isPending} onClick={onClose}>{editing ? 'Cancel' : 'Close'}</DButton>
    {editing ? <DButton form="access-role-form" type="submit" loading={mutation.isPending} disabled={mutation.isPending}>Save role</DButton> : <DButton onClick={() => setEditing(true)}>Edit role</DButton>}
  </div>}><form id="access-role-form" className="access-form" onSubmit={event => void submit(event)}>
    <DInput label="Role name" value={input.name} onChange={name => setInput(current => ({ ...current, name }))} required disabled={!editing || mutation.isPending} />
    <DInput label="Description" value={input.description} onChange={description => setInput(current => ({ ...current, description }))} disabled={!editing || mutation.isPending} />
    <h3>Permissions ({input.permissions.length})</h3>
    <div className="access-permission-groups">{groups.map(group => <fieldset className="access-checks" key={group} disabled={!editing || mutation.isPending}><legend>{group}</legend>
      {PERMISSIONS.filter(permission => permission.startsWith(`${group}.`)).map(permission => <label key={permission}><DCheckbox checked={input.permissions.includes(permission)} onChange={event => setInput(current => ({ ...current, permissions: event.target.checked ? [...current.permissions, permission] : current.permissions.filter(value => value !== permission) }))} />{permission}</label>)}
    </fieldset>)}</div>
    {error && <p role="alert">{error}</p>}
  </form></DDialog>;
}

export function AuditDetailDialog({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  return <DDialog open onClose={onClose} title="Audit detail" size="lg" footer={<div className="access-actions"><DButton variant="outline" onClick={onClose}>Close</DButton></div>}>
    <dl className="access-detail">{Object.entries({ Time: formatAccessDate(entry.timestamp), Actor: entry.actor, Action: entry.action, Domain: entry.domain, Target: entry.target, Result: entry.result, Reason: entry.reason ?? 'Not recorded' }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <h3>Metadata</h3>{entry.metadata && Object.keys(entry.metadata).length ? <dl className="access-detail">{Object.entries(entry.metadata).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || 'None'}</dd></div>)}</dl> : <p>No additional metadata.</p>}
  </DDialog>;
}
