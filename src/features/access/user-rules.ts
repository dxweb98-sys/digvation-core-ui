import { SUPER_ADMIN_ROLE } from '../auth/permissions';
import type { Role, User } from './access-api';
import type { UsersCopy } from './users-copy';

/** The signed-in operator as the role rules see it (GET /authorization/me). */
export interface Actor {
  id?: string;
  roles: readonly string[];
  permissions: readonly string[];
}

/** CORE lists every permission of a Super Admin, and of the SUPER_ADMIN role, as `*`. */
const ALL = '*';

export const isSuperAdmin = (actor: Actor) =>
  actor.roles.includes(SUPER_ADMIN_ROLE) || actor.permissions.includes(ALL);

/**
 * Whether `permissions` holds anything the actor lacks, as CORE's
 * permissionsBeyondActor decides it. A Super Admin lacks nothing.
 */
export function beyondActor(actor: Actor, permissions: readonly string[]) {
  if (isSuperAdmin(actor)) return false;
  return permissions.some((permission) => permission === ALL || !actor.permissions.includes(permission));
}

/** Why the actor may not hand out this role, or undefined when it can be chosen. */
export function roleLock(role: Role, actor: Actor, copy: { lockSuperAdmin: string; lockBeyond: string }) {
  if (isSuperAdmin(actor)) return undefined;
  if (role.slug === SUPER_ADMIN_ROLE) return copy.lockSuperAdmin;
  if (beyondActor(actor, role.permissions)) return copy.lockBeyond;
  return undefined;
}

/** Why "Nonaktifkan" is unavailable for this row, or undefined when it is allowed. */
export function deactivateBlock(
  target: User,
  me: Actor,
  copy: Pick<UsersCopy, 'notForSelf' | 'superAdminOnly'>,
) {
  if (target.id === me.id) return copy.notForSelf;
  if (target.roles.includes(SUPER_ADMIN_ROLE) && !isSuperAdmin(me)) return copy.superAdminOnly;
  return undefined;
}

/**
 * Why "Ubah role" is unavailable for this row, or undefined when it is allowed.
 * The target's permissions are the union of its roles' permissions (GET /roles);
 * a role missing from that list adds nothing, and CORE still checks the request.
 */
export function changeRolesBlock(
  target: User,
  me: Actor,
  roles: readonly Role[],
  copy: Pick<UsersCopy, 'changeSuperAdminOnly' | 'changeBeyond'>,
) {
  if (isSuperAdmin(me)) return undefined;
  if (target.roles.includes(SUPER_ADMIN_ROLE)) return copy.changeSuperAdminOnly;
  const held = roles.filter((role) => target.roles.includes(role.slug)).flatMap((role) => role.permissions);
  return beyondActor(me, held) ? copy.changeBeyond : undefined;
}
