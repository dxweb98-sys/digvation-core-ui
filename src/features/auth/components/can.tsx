import type { ReactNode } from 'react';
import type { Permission } from '../permissions';
import { usePermissions } from '../use-permissions';

/** Renders its children only when the operator holds the permission. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}
