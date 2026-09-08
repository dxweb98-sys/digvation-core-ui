import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuditDetailDialog, RoleDialog, UserDetailDialog } from './access-dialogs';
import { createMockAccessDataSource } from '../data/mock-access-data-source';
import { effectivePermissions, type AuditEntry } from '../types/access';
import { permissionGroups } from '../presentation/access-presentation';

const event: AuditEntry = {
  id: 'audit-test', timestamp: '2026-09-08T00:00:00Z', actor: 'Operator',
  action: 'Role permissions changed', domain: 'Role', target: 'Operations', result: 'SUCCESS',
  metadata: { before: 'clients.read, users.manage', after: 'clients.read, products.write' },
};

function renderDialog(element: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient()}><DToastProvider>{element}</DToastProvider></QueryClientProvider>);
}

describe('access detail hierarchy', () => {
  it('groups user access with readable labels and preserves the typed permission set', async () => {
    const source = createMockAccessDataSource();
    const roles = await source.getRoles();
    const user = (await source.getUsers())[0];
    const permissions = effectivePermissions(user.roleIds, roles);
    expect(permissionGroups(permissions).flatMap(group => group.permissions.map(permission => permission.id)).sort()).toEqual([...permissions].sort());
    renderDialog(<UserDetailDialog user={user} roles={roles} onClose={() => {}} />);
    const access = screen.getByRole('region', { name: 'Effective access' });
    expect(within(within(access).getByRole('region', { name: 'Clients' })).getByText('Read')).toBeInTheDocument();
    expect(within(within(access).getByRole('region', { name: 'Users' })).getByText('Manage')).toBeInTheDocument();
    expect(within(access).queryByText('clients.read')).not.toBeInTheDocument();
  });

  it('shows role counts and selected permissions without disabled form controls', async () => {
    const role = (await createMockAccessDataSource().getRoles())[1];
    renderDialog(<RoleDialog role={role} assignedUserCount={3} onClose={() => {}} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Assigned users').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Capabilities').nextElementSibling).toHaveTextContent(String(role.permissions.length));
  });

  it('shows only added and removed capabilities and hides raw metadata', () => {
    renderDialog(<AuditDetailDialog entry={{ ...event, metadata: { ...event.metadata, token: 'secret-token', payload: 'private payload' } }} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Role permissions changed' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Added' })).getByText('Products · Write')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Removed' })).getByText('Users · Manage')).toBeInTheDocument();
    expect(screen.queryByText('Clients · Read')).not.toBeInTheDocument();
    expect(screen.queryByText(/secret-token|private payload|clients.read/)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not claim a permission delta for reordered or duplicate identical values', () => {
    renderDialog(<AuditDetailDialog entry={{ ...event, metadata: { before: '["users.read","clients.read"]', after: 'clients.read, users.read, users.read' } }} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Role updated' })).toBeInTheDocument();
    expect(screen.getByText('No effective permission changes recorded.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Added' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Removed' })).not.toBeInTheDocument();
  });

  it('resolves role assignment deltas to role names', async () => {
    const roles = await createMockAccessDataSource().getRoles();
    renderDialog(<AuditDetailDialog roles={roles} entry={{ ...event, action: 'Role assignment changed', domain: 'User', metadata: { before: 'role-ops', after: 'role-readonly' } }} onClose={() => {}} />);
    expect(within(screen.getByRole('region', { name: 'Added' })).getByText('Read-only Operator')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Removed' })).getByText('Operations Operator')).toBeInTheDocument();
  });
});
