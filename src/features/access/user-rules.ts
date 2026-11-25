import { SUPER_ADMIN_ROLE } from '../auth/permissions';
import type { User } from './access-api';
import type { UsersCopy } from './users-copy';

/** Why "Nonaktifkan" is unavailable for this row, or undefined when it is allowed. */
export function deactivateBlock(
  target: User,
  me: { id?: string; roles: readonly string[] },
  copy: Pick<UsersCopy, 'notForSelf' | 'superAdminOnly'>,
) {
  if (target.id === me.id) return copy.notForSelf;
  if (target.roles.includes(SUPER_ADMIN_ROLE) && !me.roles.includes(SUPER_ADMIN_ROLE)) return copy.superAdminOnly;
  return undefined;
}
