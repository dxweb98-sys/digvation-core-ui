import { describe, expect, it } from 'vitest';
import { hasAnyPermission, hasPermission, PERMISSIONS } from './permissions';

describe('permissions', () => {
  const reader = { roles: ['SUPPORT'], permissions: [PERMISSIONS.CLIENTS_READ] };

  it('allows only the permissions the snapshot holds', () => {
    expect(hasPermission(reader, PERMISSIONS.CLIENTS_READ)).toBe(true);
    expect(hasPermission(reader, PERMISSIONS.CLIENTS_MANAGE)).toBe(false);
  });

  it('lets SUPER_ADMIN do everything', () => {
    expect(hasPermission({ roles: ['SUPER_ADMIN'], permissions: [] }, PERMISSIONS.BILLING_MANAGE)).toBe(true);
  });

  it('offers nothing until the snapshot arrives', () => {
    expect(hasPermission(undefined, PERMISSIONS.CLIENTS_READ)).toBe(false);
  });

  it('matches any of several permissions; an empty list is open', () => {
    expect(hasAnyPermission(reader, [PERMISSIONS.BILLING_READ, PERMISSIONS.CLIENTS_READ])).toBe(true);
    expect(hasAnyPermission(reader, [PERMISSIONS.BILLING_READ])).toBe(false);
    expect(hasAnyPermission(undefined, [])).toBe(true);
  });
});
