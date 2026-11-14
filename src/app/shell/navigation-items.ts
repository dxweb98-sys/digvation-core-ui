import { Building2, ClipboardList, FileSignature, Layers, Package, Puzzle, Mail, Shield, User, type LucideIcon } from 'lucide-react';
import { PERMISSIONS, type Permission } from '../../features/auth/permissions';

export interface NavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Shown when the operator holds any of these. */
  permissions: readonly Permission[];
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

/**
 * The menu. Installation, manifest, deployment and monitoring areas are not
 * part of this release and have no entry.
 */
export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: 'Customers',
    items: [
      { label: 'Clients', to: '/clients', icon: Building2, permissions: [PERMISSIONS.CLIENTS_READ] },
      { label: 'Services', to: '/services', icon: Layers, permissions: [PERMISSIONS.SERVICES_READ] },
      { label: 'Contracts', to: '/contracts', icon: FileSignature, permissions: [PERMISSIONS.CONTRACTS_READ] },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', to: '/products', icon: Package, permissions: [PERMISSIONS.CATALOG_READ] },
      { label: 'Capabilities & apps', to: '/catalog', icon: Puzzle, permissions: [PERMISSIONS.CATALOG_READ] },
    ],
  },
  {
    label: 'Access',
    items: [
      { label: 'Users', to: '/users', icon: User, permissions: [PERMISSIONS.USERS_READ] },
      { label: 'Invitations', to: '/invitations', icon: Mail, permissions: [PERMISSIONS.USERS_INVITE] },
      { label: 'Roles', to: '/roles', icon: Shield, permissions: [PERMISSIONS.ROLES_READ] },
      { label: 'Access audit', to: '/audit', icon: ClipboardList, permissions: [PERMISSIONS.AUTHORIZATION_AUDIT_READ] },
    ],
  },
];

export function visibleNavigation(
  groups: readonly NavigationGroup[],
  canAny: (permissions: readonly Permission[]) => boolean,
): NavigationGroup[] {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => canAny(item.permissions)) }))
    .filter((group) => group.items.length > 0);
}

/** Where the home route sends the operator: the first area they may open. */
export function firstVisibleRoute(groups: readonly NavigationGroup[]) {
  return groups[0]?.items[0]?.to;
}
