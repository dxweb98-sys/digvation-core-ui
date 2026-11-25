import { describe, expect, it } from 'vitest';
import type { PermissionItem, Role } from './access-api';
import { canGrant, customRoleLock, groupOf, groupPermissions, permissionsLock, slugFromName } from './role-rules';
import type { Actor } from './user-rules';

const COPY = {
  superAdminAlways: 'super-admin-always',
  systemOnlySuperAdmin: 'system-only',
  activateFirst: 'activate-first',
  roleBeyond: 'beyond',
};

const role = (slug: string, permissions: string[], extra: Partial<Role> = {}): Role => ({
  id: `role-${slug}`,
  slug,
  name: slug,
  description: null,
  is_system: false,
  is_active: true,
  user_count: 0,
  permissions,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...extra,
});

const ADMIN: Actor = { id: 'me', roles: ['ADMIN'], permissions: ['roles.read', 'roles.permissions.manage', 'users.read'] };
const SUPER: Actor = { id: 'me', roles: ['SUPER_ADMIN'], permissions: ['*'] };

describe('permission editor locks', () => {
  it('always locks the Super Admin role, even for a Super Admin', () => {
    const superAdmin = role('SUPER_ADMIN', ['*'], { is_system: true });
    expect(permissionsLock(superAdmin, ADMIN, COPY)).toBe('super-admin-always');
    expect(permissionsLock(superAdmin, SUPER, COPY)).toBe('super-admin-always');
  });

  it('locks a system role for a non-Super-Admin only', () => {
    const admin = role('ADMIN', ['users.read'], { is_system: true });
    expect(permissionsLock(admin, ADMIN, COPY)).toBe('system-only');
    expect(permissionsLock(admin, SUPER, COPY)).toBeUndefined();
  });

  it('locks an inactive role for everyone', () => {
    const old = role('OLD', [], { is_active: false });
    expect(permissionsLock(old, ADMIN, COPY)).toBe('activate-first');
    expect(permissionsLock(old, SUPER, COPY)).toBe('activate-first');
  });

  it('locks a role beyond the actor’s permissions, and not one within them', () => {
    expect(permissionsLock(role('FINANCE', ['billing.manage']), ADMIN, COPY)).toBe('beyond');
    expect(permissionsLock(role('SUPPORT', ['users.read']), ADMIN, COPY)).toBeUndefined();
  });

  it('shows a Super Admin no locks on custom and system roles', () => {
    expect(permissionsLock(role('FINANCE', ['billing.manage']), SUPER, COPY)).toBeUndefined();
    expect(customRoleLock(role('FINANCE', ['billing.manage']), SUPER, COPY)).toBeUndefined();
  });

  it('locks renaming and lifecycle of a custom role beyond the actor', () => {
    expect(customRoleLock(role('FINANCE', ['billing.manage']), ADMIN, COPY)).toBe('beyond');
    expect(customRoleLock(role('SUPPORT', ['users.read']), ADMIN, COPY)).toBeUndefined();
  });

  it('treats * as every permission and lets a Super Admin grant anything', () => {
    expect(permissionsLock(role('WIDE', ['*']), ADMIN, COPY)).toBe('beyond');
    expect(canGrant(ADMIN, 'users.read')).toBe(true);
    expect(canGrant(ADMIN, 'clients.manage')).toBe(false);
    expect(canGrant(SUPER, 'clients.manage')).toBe(true);
  });
});

describe('permission groups', () => {
  it('groups by slug prefix, with permissions.read under roles and unknown slugs under other', () => {
    expect(groupOf('users.invite')).toBe('users');
    expect(groupOf('permissions.read')).toBe('roles');
    expect(groupOf('authorization.audit.read')).toBe('audit');
    expect(groupOf('clients.manage')).toBe('clients');
    expect(groupOf('billing.read')).toBe('other');
  });

  it('keeps the approved order and leaves empty groups out', () => {
    const item = (slug: string): PermissionItem => ({ id: slug, slug, name: slug });
    const groups = groupPermissions([item('billing.read'), item('clients.read'), item('users.read')]);
    expect(groups.map((group) => group.key)).toEqual(['users', 'clients', 'other']);
  });

  it('orders permissions inside a group as the approved table, not by slug', () => {
    const item = (slug: string): PermissionItem => ({ id: slug, slug, name: slug });
    const [users] = groupPermissions(['users.invite', 'users.lifecycle.manage', 'users.read', 'users.roles.manage'].map(item));
    expect(users.items.map((entry) => entry.slug)).toEqual([
      'users.read',
      'users.invite',
      'users.roles.manage',
      'users.lifecycle.manage',
    ]);
  });
});

describe('slug from name', () => {
  it('uses capitals, digits and underscores', () => {
    expect(slugFromName('Operasional klien')).toBe('OPERASIONAL_KLIEN');
    expect(slugFromName('  Tim 2 — Gudang! ')).toBe('TIM_2_GUDANG');
    expect(slugFromName('Café')).toBe('CAFE');
  });
});
