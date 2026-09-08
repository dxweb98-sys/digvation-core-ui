import type { AccessDataSource } from './access-data-source';
import { PERMISSIONS, type AccessInvitation, type AccessRole, type AccessUser, type AuditEntry, type RoleInput } from '../types/access';
const now = () => new Date().toISOString();
const seedRoles: AccessRole[] = [{ id: 'role-admin', name: 'Control Center Administrator', description: 'Manages the control plane.', permissions: ['clients.read', 'clients.write', 'products.read', 'products.write', 'installations.read', 'installations.write', 'infrastructure.read', 'infrastructure.write', 'runtime.read', 'incidents.read', 'incidents.manage', 'deployments.read', 'operations.read', 'operations.request', 'users.read', 'users.manage', 'roles.read', 'roles.manage', 'audit.read'], updatedAt: '2026-09-07T04:00:00Z' }, { id: 'role-ops', name: 'Operations Operator', description: 'Responds to operational records.', permissions: ['clients.read', 'products.read', 'installations.read', 'infrastructure.read', 'runtime.read', 'incidents.read', 'incidents.manage', 'deployments.read', 'operations.read', 'operations.request', 'audit.read'], updatedAt: '2026-09-06T04:00:00Z' }, { id: 'role-readonly', name: 'Read-only Operator', description: 'Reviews control plane state.', permissions: ['clients.read', 'products.read', 'commercial.read', 'installations.read', 'infrastructure.read', 'runtime.read', 'incidents.read', 'deployments.read', 'operations.read', 'users.read', 'roles.read', 'audit.read'], updatedAt: '2026-09-05T04:00:00Z' }];
const seedUsers: AccessUser[] = [{ id: 'user-rani', name: 'Rani Pratama', email: 'rani@digvation.id', status: 'ACTIVE', roleIds: ['role-admin'], createdAt: '2026-06-01T04:00:00Z', lastActivityAt: '2026-09-07T06:15:00Z', updatedAt: '2026-09-07T06:15:00Z' }, { id: 'user-farah', name: 'Farah Putri', email: 'farah@digvation.id', status: 'ACTIVE', roleIds: ['role-ops'], createdAt: '2026-07-02T04:00:00Z', lastActivityAt: '2026-09-07T05:40:00Z', updatedAt: '2026-09-07T05:40:00Z' }];
const seedInvitations: AccessInvitation[] = [{ id: 'invite-dimas', email: 'dimas@digvation.id', roleId: 'role-readonly', status: 'PENDING', invitedBy: 'Rani Pratama', createdAt: '2026-09-07T04:00:00Z', expiresAt: '2026-09-14T04:00:00Z' }];
const seedAudit: AuditEntry[] = [{ id: 'audit-client', timestamp: '2026-09-07T03:00:00Z', actor: 'Rani Pratama', action: 'Client lifecycle changed', domain: 'Client', target: 'Nova Salon', result: 'SUCCESS', reason: 'Commercial review completed.' }, { id: 'audit-install', timestamp: '2026-09-07T02:00:00Z', actor: 'Farah Putri', action: 'Infrastructure bound', domain: 'Installation', target: 'Nova POS Production', result: 'SUCCESS' }];
const copy = <T,>(value: T): T => structuredClone(value);
export function createMockAccessDataSource(): AccessDataSource {
    const roles = copy(seedRoles);
    const users = copy(seedUsers);
    const invitations = copy(seedInvitations);
    const audit = copy(seedAudit);
    const log = (action: string, domain: string, target: string, metadata?: Record<string, string>) => {
        audit.unshift({ id: crypto.randomUUID(), timestamp: now(), actor: 'Rani Pratama', action, domain, target, result: 'SUCCESS', metadata });
    };
    const expireInvitations = () => {
        for (const invitation of invitations) {
            if (invitation.status === 'PENDING' && Date.parse(invitation.expiresAt) <= Date.now())
                invitation.status = 'EXPIRED';
        }
    };
    function validateRole(input: RoleInput, id?: string): RoleInput {
        const name = input.name.trim();
        if (!name)
            throw Error('Role name is required.');
        if (roles.some(role => role.id !== id && role.name.toLowerCase() === name.toLowerCase()))
            throw Error('A role with this name already exists.');
        if (!input.permissions.every(permission => PERMISSIONS.includes(permission)))
            throw Error('Unknown permission.');
        return { name, description: input.description.trim(), permissions: [...new Set(input.permissions)] };
    }
    return {
        async getUsers() { return copy(users); },
        async getRoles() { return copy(roles); },
        async getInvitations() { expireInvitations(); return copy(invitations); },
        async getAudit() { return copy(audit).sort((a, b) => b.timestamp.localeCompare(a.timestamp)); },
        async updateUserRoles(id, roleIds) {
            const user = users.find(user => user.id === id);
            if (!user)
                throw Error('User not found.');
            if (!roleIds.every(id => roles.some(role => role.id === id)))
                throw Error('Role not found.');
            const before = user.roleIds.join(', ');
            user.roleIds = [...new Set(roleIds)];
            user.updatedAt = now();
            log('Role assignment changed', 'User', user.email, { before, after: user.roleIds.join(', ') });
            return copy(user);
        },
        async transitionUser(id, status) {
            const user = users.find(user => user.id === id);
            if (!user)
                throw Error('User not found.');
            if (!['ACTIVE', 'INACTIVE'].includes(status))
                throw Error('Invalid user status.');
            if (user.status === status)
                throw Error('User already has this status.');
            const before = user.status;
            user.status = status;
            user.updatedAt = now();
            log(`User ${status.toLowerCase()}`, 'User', user.email, { before, after: status });
            return copy(user);
        },
        async createInvitation(input) {
            const email = input.email.trim().toLowerCase();
            if (!/^\S+@\S+\.\S+$/.test(email))
                throw Error('Enter a valid email address.');
            if (!roles.some(role => role.id === input.roleId))
                throw Error('Role not found.');
            expireInvitations();
            if (users.some(user => user.email.toLowerCase() === email))
                throw Error('This email already belongs to a user.');
            if (invitations.some(invitation => invitation.email === email && invitation.status === 'PENDING'))
                throw Error('A pending invitation already exists for this email.');
            const invitation: AccessInvitation = { id: crypto.randomUUID(), email, roleId: input.roleId, status: 'PENDING', invitedBy: 'Rani Pratama', createdAt: now(), expiresAt: new Date(Date.now() + 604800000).toISOString() };
            invitations.unshift(invitation);
            log('Invitation created', 'Invitation', email, { roleId: input.roleId });
            return copy(invitation);
        },
        async revokeInvitation(id) {
            expireInvitations();
            const invitation = invitations.find(invitation => invitation.id === id);
            if (!invitation || invitation.status !== 'PENDING')
                throw Error('Only pending invitations can be revoked.');
            invitation.status = 'REVOKED';
            log('Invitation revoked', 'Invitation', invitation.email, { before: 'PENDING', after: 'REVOKED' });
            return copy(invitation);
        },
        async createRole(input) {
            const role = { ...validateRole(input), id: crypto.randomUUID(), updatedAt: now() };
            roles.push(role);
            log('Role created', 'Role', role.name, { permissions: role.permissions.join(', ') });
            return copy(role);
        },
        async updateRole(id, input) {
            const role = roles.find(role => role.id === id);
            if (!role)
                throw Error('Role not found.');
            const values = validateRole(input, id);
            const before = role.permissions.join(', ');
            Object.assign(role, values, { updatedAt: now() });
            log('Role permissions changed', 'Role', role.name, { before, after: role.permissions.join(', ') });
            return copy(role);
        },
    };
}
