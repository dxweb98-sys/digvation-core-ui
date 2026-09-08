import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockAccessDataSource } from './mock-access-data-source';
import { effectivePermissions, type AccessPermission } from '../types/access';

afterEach(() => vi.useRealTimers());

describe('access data source', () => {
  it('isolates instances and prevents callers from mutating stored records', async () => {
    const source = createMockAccessDataSource();
    const roles = await source.getRoles();
    roles[0].permissions.length = 0;
    expect((await source.getRoles())[0].permissions.length).toBeGreaterThan(0);
    const assigned = ['role-readonly'];
    const updated = await source.updateUserRoles('user-farah', assigned);
    assigned.push('role-admin');
    updated.roleIds.length = 0;
    expect((await source.getUsers())[1].roleIds).toEqual(['role-readonly']);
    expect((await createMockAccessDataSource().getUsers())[1].roleIds).toEqual(['role-ops']);
  });

  it('normalizes invitations and rejects duplicate users, pending emails and invalid roles', async () => {
    const source = createMockAccessDataSource();
    const invitation = await source.createInvitation({ email: ' New@Example.com ', roleId: 'role-ops' });
    expect(invitation.email).toBe('new@example.com');
    await expect(source.createInvitation({ email: 'NEW@example.com', roleId: 'role-ops' })).rejects.toThrow('pending invitation');
    await expect(source.createInvitation({ email: 'RANI@digvation.id', roleId: 'role-ops' })).rejects.toThrow('already belongs');
    await expect(source.createInvitation({ email: 'invalid', roleId: 'role-ops' })).rejects.toThrow('valid email');
    await expect(source.createInvitation({ email: 'other@example.com', roleId: 'missing' })).rejects.toThrow('Role not found');
    expect(await source.getAudit()).toHaveLength(3);
  });

  it('only revokes pending invitations and expires them according to the clock', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T00:00:00Z'));
    const source = createMockAccessDataSource();
    await source.revokeInvitation('invite-dimas');
    await expect(source.revokeInvitation('invite-dimas')).rejects.toThrow('Only pending');
    const invitation = await source.createInvitation({ email: 'expiry@example.com', roleId: 'role-ops' });
    vi.setSystemTime(new Date('2026-09-15T00:00:00Z'));
    expect((await source.getInvitations()).find(value => value.id === invitation.id)?.status).toBe('EXPIRED');
    await expect(source.revokeInvitation(invitation.id)).rejects.toThrow('Only pending');
    await expect(source.createInvitation({ email: invitation.email, roleId: 'role-ops' })).resolves.toMatchObject({ status: 'PENDING' });
  });

  it('validates role names and typed permission boundaries without partial writes', async () => {
    const source = createMockAccessDataSource();
    await expect(source.createRole({ name: ' ', description: '', permissions: [] })).rejects.toThrow('required');
    await expect(source.createRole({ name: ' read-only operator ', description: '', permissions: [] })).rejects.toThrow('already exists');
    await expect(source.updateRole('role-ops', { name: 'Changed', description: '', permissions: ['root.all' as AccessPermission] })).rejects.toThrow('Unknown permission');
    expect((await source.getRoles())[1].name).toBe('Operations Operator');
    expect(await source.getAudit()).toHaveLength(2);
    const permissions: AccessPermission[] = ['users.read', 'users.read'];
    const role = await source.createRole({ name: ' Reviewer ', description: ' Review ', permissions });
    permissions.push('users.manage');
    expect(role).toMatchObject({ name: 'Reviewer', description: 'Review', permissions: ['users.read'] });
    expect((await source.getRoles()).find(value => value.id === role.id)?.permissions).toEqual(['users.read']);
  });

  it('updates effective permissions through assignments and role edits, and records each mutation', async () => {
    const source = createMockAccessDataSource();
    await source.updateUserRoles('user-farah', ['role-ops', 'role-readonly', 'role-ops']);
    let roles = await source.getRoles();
    const user = (await source.getUsers())[1];
    expect(effectivePermissions(user.roleIds, roles)).toContain('incidents.manage');
    await source.updateRole('role-ops', { name: 'Operations Operator', description: '', permissions: ['users.manage'] });
    roles = await source.getRoles();
    expect(effectivePermissions(user.roleIds, roles)).toContain('users.manage');
    expect(effectivePermissions(user.roleIds, roles)).not.toContain('incidents.manage');
    await source.transitionUser(user.id, 'INACTIVE');
    await source.transitionUser(user.id, 'ACTIVE');
    await expect(source.transitionUser(user.id, 'ACTIVE')).rejects.toThrow('already');
    await expect(source.updateUserRoles(user.id, ['missing'])).rejects.toThrow('Role not found');
    await expect(source.updateUserRoles('missing', [])).rejects.toThrow('User not found');
    const audit = await source.getAudit();
    expect(audit).toHaveLength(6);
    expect(new Set(audit.map(entry => entry.id)).size).toBe(audit.length);
    expect(audit.find(entry => entry.action === 'User inactive')?.metadata).toEqual({ before: 'ACTIVE', after: 'INACTIVE' });
    audit[0].actor = 'tampered';
    expect((await source.getAudit())[0].actor).toBe('Rani Pratama');
  });
});
