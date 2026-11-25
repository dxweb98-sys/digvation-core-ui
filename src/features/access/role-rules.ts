import { SUPER_ADMIN_ROLE } from '../auth/permissions';
import type { PermissionItem, Role } from './access-api';
import { beyondActor, isSuperAdmin, type Actor } from './user-rules';

/** CORE shows the SUPER_ADMIN role's permissions as `*`. */
export const ALL_PERMISSIONS = '*';

export interface RoleLockCopy {
  superAdminAlways: string;
  systemOnlySuperAdmin: string;
  activateFirst: string;
  roleBeyond: string;
}

/**
 * Why "Atur izin" is unavailable for a role, or undefined when it is allowed.
 * Mirrors RoleService.setRolePermissions: SUPER_ADMIN never takes assignments,
 * system roles need a Super Admin, an inactive role must be reactivated first,
 * and a non-Super-Admin may only change a role whose permissions they hold.
 */
export function permissionsLock(role: Role, actor: Actor, copy: RoleLockCopy) {
  if (role.slug === SUPER_ADMIN_ROLE) return copy.superAdminAlways;
  if (role.is_system && !isSuperAdmin(actor)) return copy.systemOnlySuperAdmin;
  if (!role.is_active) return copy.activateFirst;
  if (beyondActor(actor, role.permissions)) return copy.roleBeyond;
  return undefined;
}

/**
 * Why renaming or (re)activating a custom role is unavailable, or undefined.
 * Mirrors RoleService.mutableCustomRole: system roles have no such items, and a
 * non-Super-Admin may only change a role whose permissions they hold.
 */
export function customRoleLock(role: Role, actor: Actor, copy: Pick<RoleLockCopy, 'roleBeyond'>) {
  return beyondActor(actor, role.permissions) ? copy.roleBeyond : undefined;
}

/** Whether the actor may grant this permission; a Super Admin holds every one. */
export const canGrant = (actor: Actor, slug: string) => !beyondActor(actor, [slug]);

export type PermissionGroupKey = 'users' | 'roles' | 'audit' | 'clients' | 'other';

const GROUP_ORDER: readonly PermissionGroupKey[] = ['users', 'roles', 'audit', 'clients', 'other'];

/** The editor group of a permission slug, by prefix (04-roles.html, section C). */
export function groupOf(slug: string): PermissionGroupKey {
  if (slug.startsWith('users.')) return 'users';
  if (slug.startsWith('roles.') || slug === 'permissions.read') return 'roles';
  if (slug.startsWith('authorization.')) return 'audit';
  if (slug.startsWith('clients.')) return 'clients';
  return 'other';
}

/**
 * The approved order inside a group: the permission label table of 04-roles.html,
 * which is also the order of CORE's catalog (authorization.constants.ts).
 * GET /permissions returns them by slug; unknown slugs follow in that order.
 */
const PERMISSION_ORDER = [
  'users.read',
  'users.invite',
  'users.roles.manage',
  'users.lifecycle.manage',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  'roles.permissions.manage',
  'permissions.read',
  'authorization.audit.read',
  'clients.read',
  'clients.manage',
  'clients.lifecycle.manage',
];

const rank = (slug: string) => {
  const index = PERMISSION_ORDER.indexOf(slug);
  return index === -1 ? PERMISSION_ORDER.length : index;
};

/** The catalog in editor groups, in the approved order; empty groups are left out. */
export function groupPermissions(catalog: readonly PermissionItem[]) {
  const ordered = [...catalog].sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));
  return GROUP_ORDER.map((key) => ({ key, items: ordered.filter((item) => groupOf(item.slug) === key) })).filter(
    (group) => group.items.length > 0,
  );
}

/** "Buat role": the slug the name suggests — capitals, digits and underscores. */
export function slugFromName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}
