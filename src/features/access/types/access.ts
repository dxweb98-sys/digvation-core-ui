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
export interface RoleInput {
    name: string;
    description: string;
    permissions: AccessPermission[];
}
export function effectivePermissions(roleIds: readonly string[], roles: readonly AccessRole[]): AccessPermission[] {
    return [...new Set(roles.filter(role => roleIds.includes(role.id)).flatMap(role => role.permissions))];
}

export const formatAccessDate = formatDateTime;
