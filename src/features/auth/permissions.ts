import type { Dto } from '../../shared/api/types';

/** Permission codes CORE enforces (core-v2 `authorization.constants.ts`). */
export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_INVITE: 'users.invite',
  USERS_ROLES_MANAGE: 'users.roles.manage',
  USERS_LIFECYCLE_MANAGE: 'users.lifecycle.manage',
  ROLES_READ: 'roles.read',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_PERMISSIONS_MANAGE: 'roles.permissions.manage',
  PERMISSIONS_READ: 'permissions.read',
  AUTHORIZATION_AUDIT_READ: 'authorization.audit.read',
  CATALOG_READ: 'catalog.read',
  CATALOG_MANAGE: 'catalog.manage',
  CATALOG_LIFECYCLE_MANAGE: 'catalog.lifecycle.manage',
  RELEASES_MANAGE: 'releases.manage',
  CLIENTS_READ: 'clients.read',
  CLIENTS_MANAGE: 'clients.manage',
  CLIENTS_LIFECYCLE_MANAGE: 'clients.lifecycle.manage',
  SERVICES_READ: 'services.read',
  SERVICES_MANAGE: 'services.manage',
  CONTRACTS_READ: 'contracts.read',
  CONTRACTS_MANAGE: 'contracts.manage',
  BILLING_READ: 'billing.read',
  BILLING_MANAGE: 'billing.manage',
  BILLING_SETTINGS_MANAGE: 'billing.settings.manage',
  PAYMENTS_MANAGE: 'payments.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

export type AuthorizationSnapshot = Dto<'AuthorizationSnapshotDto'>;

/**
 * Whether the snapshot from GET /authorization/me allows a permission. It only
 * decides which controls are offered; CORE still enforces every request.
 */
export function hasPermission(
  snapshot: AuthorizationSnapshot | undefined,
  permission: Permission,
): boolean {
  if (!snapshot) return false;
  return snapshot.roles.includes(SUPER_ADMIN_ROLE) || snapshot.permissions.includes(permission);
}

/** Any of the given permissions; an empty list is always allowed. */
export function hasAnyPermission(
  snapshot: AuthorizationSnapshot | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.length === 0 || permissions.some((item) => hasPermission(snapshot, item));
}
