import { Banknote, Building2, ClipboardList, FileMinus, FileSignature, Receipt, Settings, Layers, Package, Puzzle, Mail, Shield, User, type LucideIcon } from 'lucide-react';
import { PERMISSIONS, type Permission } from '../../features/auth/permissions';
import { isParkedPath } from '../parked-areas';

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
 * part of this release and have no entry. Entries of a parked area
 * (../parked-areas.ts) are kept here but left out of the menu.
 */
const ALL_NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: 'Customers',
    items: [
      { label: 'Clients', to: '/clients', icon: Building2, permissions: [PERMISSIONS.CLIENTS_READ] },
      { label: 'Services', to: '/services', icon: Layers, permissions: [PERMISSIONS.SERVICES_READ] },
      { label: 'Contracts', to: '/contracts', icon: FileSignature, permissions: [PERMISSIONS.CONTRACTS_READ] },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Invoices', to: '/invoices', icon: Receipt, permissions: [PERMISSIONS.BILLING_READ] },
      { label: 'Payments', to: '/payments', icon: Banknote, permissions: [PERMISSIONS.BILLING_READ] },
      { label: 'Credit notes', to: '/credit-notes', icon: FileMinus, permissions: [PERMISSIONS.BILLING_READ] },
      { label: 'Billing settings', to: '/billing-settings', icon: Settings, permissions: [PERMISSIONS.BILLING_READ] },
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

export const NAVIGATION_GROUPS: NavigationGroup[] = ALL_NAVIGATION_GROUPS.map((group) => ({
  ...group,
  items: group.items.filter((item) => !isParkedPath(item.to)),
})).filter((group) => group.items.length > 0);

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
