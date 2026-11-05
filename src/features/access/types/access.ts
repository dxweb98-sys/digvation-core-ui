import { formatDateTime } from '../../../shared/format/date-time';
export type AccessUserStatus = 'ACTIVE' | 'INACTIVE';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
export type AuditResult = 'SUCCESS' | 'REVOKED';
export const PERMISSIONS = ['clients.read', 'clients.write', 'products.read', 'products.write', 'commercial.read', 'commercial.write', 'installations.read', 'installations.write', 'infrastructure.read', 'infrastructure.write', 'runtime.read', 'incidents.read', 'incidents.manage', 'deployments.read', 'operations.read', 'operations.request', 'users.read', 'users.manage', 'roles.read', 'roles.manage', 'audit.read'] as const;
export type AccessPermission = string;
export const ALL_PERMISSIONS = '*';
export interface AccessRole {
    id: string;
    slug?: string;
    name: string;
    description: string;
    permissions: AccessPermission[];
    updatedAt: string;
}
export interface AccessUser {
    id: string;
    name: string;
    email: string;
    status: AccessUserStatus;
    roleIds: string[];
    createdAt: string;
    lastActivityAt?: string;
    updatedAt: string;
}
export interface AccessInvitation {
    id: string;
    email: string;
    roleId: string;
    roleIds?: string[];
    status: InvitationStatus;
    invitedBy: string;
    createdAt: string;
    expiresAt: string;
}
export interface AuditEntry {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    domain: string;
    target: string;
    result: AuditResult;
    reason?: string;
    metadata?: Record<string, string>;
}
/** Event and target codes CORE writes to its authorization audit log. */
export const ACCESS_AUDIT_EVENTS = ['ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DEACTIVATED', 'ROLE_REACTIVATED', 'ROLE_PERMISSIONS_UPDATED', 'USER_ROLES_UPDATED', 'INVITATION_CREATED', 'INVITATION_ACCEPTED', 'INVITATION_REVOKED', 'INVITATION_REVOKED_DELIVERY_FAILURE', 'SUPER_ADMIN_ASSIGNED'] as const;
export const ACCESS_AUDIT_TARGET_TYPES = ['role', 'user', 'invitation'] as const;
export interface AccessAuditRecord {
    id: string;
    actorUserId: string | null;
    event: string;
    targetType: string;
    targetId: string | null;
    createdAt: string;
    roleSlug?: string;
    roleSlugs?: string[];
    previousRoleSlugs?: string[];
    permissionSlugs?: string[];
    expiresAt?: string;
}
export interface AccessAuditQuery {
    page: number;
    limit: number;
    event?: string;
    targetType?: string;
    actorUserId?: string;
}
export interface AccessAuditPage {
    items: AccessAuditRecord[];
    total: number;
}
export interface RoleInput {
    name: string;
    description: string;
    permissions: AccessPermission[];
}
export function effectivePermissions(roleIds: readonly string[], roles: readonly AccessRole[]): AccessPermission[] {
    return [...new Set(roles.filter(role => roleIds.includes(role.id)).flatMap(role => role.permissions))];
}

export const formatAccessDate = formatDateTime;
