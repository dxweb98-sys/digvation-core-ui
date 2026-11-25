import { Building2, Receipt } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS, type Permission } from '../../features/auth/permissions';
import { applicationRoutes } from '../router/application-routes';
import { isParkedPath } from '../parked-areas';
import { firstVisibleRoute, NAVIGATION_GROUPS, visibleNavigation, type NavigationGroup } from './navigation-items';

const groups: NavigationGroup[] = [
  { label: 'Customers', items: [{ label: 'Clients', to: '/clients', icon: Building2, permissions: [PERMISSIONS.CLIENTS_READ] }] },
  { label: 'Billing', items: [{ label: 'Invoices', to: '/invoices', icon: Receipt, permissions: [PERMISSIONS.BILLING_READ] }] },
];

describe('navigation visibility', () => {
  it('hides items and empty groups the operator may not open', () => {
    const canAny = (permissions: readonly Permission[]) => permissions.includes(PERMISSIONS.BILLING_READ);
    const visible = visibleNavigation(groups, canAny);
    expect(visible.map((group) => group.label)).toEqual(['Billing']);
    expect(firstVisibleRoute(visible)).toBe('/invoices');
  });

  it('never sends home to itself', () => {
    const withHome: NavigationGroup[] = [
      { label: 'Overview', items: [{ label: 'Home', to: '/', icon: Building2, permissions: [] }] },
      ...groups,
    ];
    expect(firstVisibleRoute(visibleNavigation(withHome, () => false))).toBeUndefined();
    expect(firstVisibleRoute(visibleNavigation(withHome, () => true))).toBe('/clients');
  });

  it('has no start route without any access', () => {
    expect(firstVisibleRoute(visibleNavigation(groups, () => false))).toBeUndefined();
  });
});

describe('parked areas', () => {
  it('leaves every parked area out of the menu and the router', () => {
    const menu = NAVIGATION_GROUPS.flatMap((group) => group.items.map((item) => item.to));
    expect(menu).toEqual(['/', '/users', '/invitations', '/roles', '/audit']);
    const routed = (applicationRoutes.find((route) => route.path === '/')?.children ?? [])
      .map((route) => `/${route.path ?? ''}`);
    expect(routed.filter(isParkedPath)).toEqual([]);
  });
});
