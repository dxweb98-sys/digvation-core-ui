import { DBadge, DButton, DCheckbox, DConfirmDialog, DInput, DSelect, useToast } from '@digvation/ui';
import { AppDialog, DetailItem, DetailList, DialogActions } from '../../../shared/ui/app-dialog';
import { useLayoutEffect, useRef, useState } from 'react';
import { useCreateInvitation, useSaveRole, useUpdateUserRoles, useUserStatus } from '../hooks/use-access';
import { formatAccessDate, effectivePermissions, PERMISSIONS, type AccessRole, type AccessUser, type AuditEntry, type RoleInput } from '../types/access';

import { PermissionSummary } from './permission-summary';
import { auditChanges, permissionGroups } from '../presentation/access-presentation';

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
    <AppDialog kind="detail" open onClose={() => { if (!busy) onClose(); }} title={user.name} status={<DBadge variant={user.status === 'ACTIVE' ? 'success' : 'secondary'}>{user.status === 'ACTIVE' ? 'Active' : 'Inactive'}</DBadge>} meta={user.email} footer={<DialogActions
      destructive={<DButton variant="outline" disabled={busy} onClick={() => setConfirmStatus(true)}>{user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</DButton>}
      secondary={<DButton variant="outline" disabled={busy} onClick={onClose}>Close</DButton>}
      primary={<DButton loading={updateRoles.isPending} disabled={busy} onClick={() => void saveRoles()}>Save roles</DButton>}
    />}>
      <div className="access-detail-content">
        <section className="access-section" aria-labelledby="user-overview-title">
          <h3 id="user-overview-title">Overview</h3>
          <DetailList>
            <DetailItem label="Status">{user.status === 'ACTIVE' ? 'Active' : 'Inactive'}</DetailItem>
            <DetailItem label="Last activity">{user.lastActivityAt ? formatAccessDate(user.lastActivityAt) : 'Never'}</DetailItem>
            <DetailItem label="Created">{formatAccessDate(user.createdAt)}</DetailItem>
            <DetailItem label="Updated">{formatAccessDate(user.updatedAt)}</DetailItem>
          </DetailList>
        </section>
        <section className="access-section" aria-labelledby="assigned-roles-title">
          <h3 id="assigned-roles-title">Assigned roles</h3>
          <fieldset className="access-role-options" aria-labelledby="assigned-roles-title" disabled={busy}>{roles.map(role => <label key={role.id}>
            <DCheckbox aria-label={role.name} checked={roleIds.includes(role.id)} onChange={event => setRoleIds(current => event.target.checked ? [...current, role.id] : current.filter(id => id !== role.id))} />
            <span><strong>{role.name}</strong>{role.description && <span className="access-secondary">{role.description}</span>}</span>
          </label>)}</fieldset>
        </section>
        <section className="access-section" aria-labelledby="effective-access-title">
          <h3 id="effective-access-title">Effective access</h3>
          <p className="access-secondary">{user.status === 'INACTIVE' ? 'This user is inactive. Assigned roles are retained.' : 'Access from the selected roles; save to apply changes.'}</p>
          <PermissionSummary permissions={capabilities} />
        </section>
      </div>
    </AppDialog>
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
  return <AppDialog kind="form" open onClose={() => { if (!mutation.isPending) onClose(); }} title="Create invitation" description="Creates a mock invitation record. No email is sent." footer={<div className="access-actions">
    <DButton variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancel</DButton><DButton type="submit" form="access-invitation-form" loading={mutation.isPending} disabled={mutation.isPending || !roleId}>Create invitation</DButton>
  </div>}><form id="access-invitation-form" className="access-form" onSubmit={event => void submit(event)}>
    <DInput label="Email" type="email" value={email} onChange={setEmail} required disabled={mutation.isPending} />
    <DSelect label="Role" value={roleId} options={roles.map(role => ({ value: role.id, label: role.name }))} onValueChange={value => setRoleId(value as string)} disabled={mutation.isPending} />
    {!roles.length && <p>Create a role before inviting an operator.</p>}
    {error && <p role="alert">{error}</p>}
  </form></AppDialog>;
}

export function RoleDialog({ role, assignedUserCount, onClose }: { role?: AccessRole; assignedUserCount: number; onClose: () => void }) {
  const [savedRole, setSavedRole] = useState(role);
  const contentRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(!role);
  const [input, setInput] = useState<RoleInput>({ name: role?.name ?? '', description: role?.description ?? '', permissions: savedRole?.permissions ?? [] });
  const [error, setError] = useState('');
  const mutation = useSaveRole(savedRole?.id);
  const dirty = !savedRole || input.name.trim() !== savedRole.name || input.description.trim() !== savedRole.description ||
    input.permissions.length !== savedRole.permissions.length || input.permissions.some(permission => !savedRole.permissions.includes(permission));
  useLayoutEffect(() => {
    // DDialog owns scrolling; this wrapper is its direct content child.
    const scrollContainer = contentRef.current?.parentElement;
    if (scrollContainer) scrollContainer.scrollTop = 0;
    if (editing) contentRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }, [editing]);
  function cancelEdit() {
    if (!savedRole) { onClose(); return; }
    setInput({ name: savedRole.name, description: savedRole.description, permissions: [...savedRole.permissions] });
    setError('');
    setEditing(false);
  }
  const { showToast } = useToast();
  const groups = permissionGroups(PERMISSIONS);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mutation.isPending || !dirty) return;
    setError('');
    try {
      const updated = await mutation.mutateAsync(input);
      showToast({ title: savedRole ? 'Role updated' : 'Role created', variant: 'success' });
      if (!savedRole) { onClose(); return; }
      setSavedRole(updated);
      setInput({ name: updated.name, description: updated.description, permissions: [...updated.permissions] });
      setEditing(false);
    } catch (error) {
      setError(errorMessage(error));
      showToast({ title: 'Role save failed', description: errorMessage(error), variant: 'danger' });
    }
  }
  return <AppDialog kind="wide" open onClose={() => { if (!mutation.isPending) onClose(); }} title={savedRole ? editing ? 'Edit role' : savedRole.name : 'Create role'} description={editing ? savedRole?.name : savedRole?.description || undefined} footer={<div className="access-actions">
    <DButton variant="outline" disabled={mutation.isPending} onClick={editing ? cancelEdit : onClose}>{editing ? 'Cancel' : 'Close'}</DButton>
    {editing ? <DButton form="access-role-form" type="submit" loading={mutation.isPending} disabled={mutation.isPending || !dirty}>{savedRole ? 'Save changes' : 'Save role'}</DButton> : <DButton onClick={() => setEditing(true)}>Edit role</DButton>}
  </div>}>
    <div ref={contentRef}>{editing ? <form id="access-role-form" className="access-detail-content" onSubmit={event => void submit(event)}>
      <section className="access-section access-form" aria-labelledby="role-information-title">
        <h3 id="role-information-title">Role information</h3>
        <DInput label="Role name" value={input.name} onChange={name => setInput(current => ({ ...current, name }))} required disabled={mutation.isPending} />
        <DInput label="Description" value={input.description} onChange={description => setInput(current => ({ ...current, description }))} disabled={mutation.isPending} />
      </section>
      <section className="access-section" aria-labelledby="role-permissions-title">
        <h3 id="role-permissions-title">Permissions <span className="access-section-count">{input.permissions.length} selected</span></h3>
        <div className="access-permission-groups">{groups.map(group => <fieldset className="access-checks" key={group.domain} disabled={mutation.isPending}><legend>{group.label}</legend>
          {group.permissions.map(permission => <label key={permission.id}><DCheckbox aria-label={`${group.label} ${permission.label}`} checked={input.permissions.includes(permission.id)} onChange={event => setInput(current => ({ ...current, permissions: event.target.checked ? [...current.permissions, permission.id] : current.permissions.filter(value => value !== permission.id) }))} />{permission.label}</label>)}
        </fieldset>)}</div>
      </section>
      {error && <p role="alert">{error}</p>}
    </form> : <div className="access-detail-content">
      <section className="access-section" aria-labelledby="role-overview-title">
        <h3 id="role-overview-title">Overview</h3>
        <DetailList><DetailItem label="Assigned users">{assignedUserCount}</DetailItem><DetailItem label="Capabilities">{savedRole?.permissions.length ?? 0}</DetailItem></DetailList>
      </section>
      <section className="access-section" aria-labelledby="role-permissions-title"><h3 id="role-permissions-title">Permissions</h3><PermissionSummary permissions={savedRole?.permissions ?? []} /></section>
    </div>}</div>
  </AppDialog>;
}

export function AuditDetailDialog({ entry, roles = [], onClose }: { entry: AuditEntry; roles?: AccessRole[]; onClose: () => void }) {
  const changes = auditChanges(entry, roles);
  const noChanges = changes && !changes.added.length && !changes.removed.length;
  const title = noChanges && entry.action === 'Role permissions changed' ? 'Role updated' : entry.action;
  const statuses: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING: 'Pending', REVOKED: 'Revoked' };
  const previousStatus = statuses[entry.metadata?.before ?? ''];
  const nextStatus = statuses[entry.metadata?.after ?? ''];
  return <AppDialog kind="detail" open onClose={onClose} title={title} status={<DBadge variant={entry.result === 'SUCCESS' ? 'success' : 'secondary'}>{entry.result === 'SUCCESS' ? 'Success' : 'Revoked'}</DBadge>} meta={entry.target} footer={<div className="access-actions"><DButton variant="outline" onClick={onClose}>Close</DButton></div>}>
    <div className="access-detail-content">
      <section className="access-section" aria-labelledby="audit-event-title">
        <h3 id="audit-event-title">Event details</h3>
        <DetailList>{Object.entries({ Actor: entry.actor, Time: formatAccessDate(entry.timestamp), Domain: entry.domain, Target: entry.target, Reason: entry.reason }).map(([label, value]) => <DetailItem key={label} label={label}>{value}</DetailItem>)}</DetailList>
      </section>
      <section className="access-section" aria-labelledby="audit-changes-title">
        <h3 id="audit-changes-title">Changes</h3>
        {changes ? noChanges ? <p className="access-secondary">{changes.isRoleAssignment ? 'No effective role assignment changes recorded.' : 'No effective permission changes recorded.'}</p> : <div className="access-change-groups">
          {changes.added.length > 0 && <section aria-label="Added"><h4>Added</h4><ul>{changes.added.map(value => <li key={value}><span aria-hidden="true" className="access-added">+</span>{value}</li>)}</ul></section>}
          {changes.removed.length > 0 && <section aria-label="Removed"><h4>Removed</h4><ul>{changes.removed.map(value => <li key={value}><span aria-hidden="true" className="access-removed">−</span>{value}</li>)}</ul></section>}
        </div> : previousStatus && nextStatus ? <p>{previousStatus} → {nextStatus}</p> : <p className="access-secondary">No additional change details recorded.</p>}
      </section>
    </div>
  </AppDialog>;
}
