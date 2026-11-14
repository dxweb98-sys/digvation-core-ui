import { Building2, Receipt } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS, type Permission } from '../../features/auth/permissions';
import { firstVisibleRoute, visibleNavigation, type NavigationGroup } from './navigation-items';

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

  it('has no start route without any access', () => {
    expect(firstVisibleRoute(visibleNavigation(groups, () => false))).toBeUndefined();
  });
});
