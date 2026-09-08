import { DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationRoutes } from '../../../app/router/application-routes';
import { accessDataSource } from '../data/resolve-access-data-source';
import { createMockAccessDataSource } from '../data/mock-access-data-source';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-09-08T00:00:00Z')); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
function AccessRoutes() { return useRoutes(applicationRoutes); }
function renderAccess(path: string) {
  const source = createMockAccessDataSource();
  for (const method of Object.keys(source) as (keyof typeof source)[]) vi.spyOn(accessDataSource, method).mockImplementation(source[method] as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><DToastProvider><MemoryRouter initialEntries={[path]}><AccessRoutes /></MemoryRouter></DToastProvider></QueryClientProvider>);
  return source;
}
function openFirstAction(label: string) {
  const trigger = screen.getByRole('table').querySelector<HTMLButtonElement>('tbody button');
  expect(trigger).not.toBeNull();
  fireEvent.click(trigger!);
  fireEvent.click(screen.getByText(label));
}

describe('access workflows', () => {
  it('shows saved user roles and refreshed status without closing the detail', async () => {
    const source = renderAccess('/users');
    await screen.findAllByText('rani@digvation.id');
    openFirstAction('View User Detail');
    const dialog = screen.getByRole('dialog', { name: 'Rani Pratama' });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Read-only Operator' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save roles' }));
    await screen.findByText('User roles updated');
    expect((await source.getUsers())[0].roleIds).toContain('role-readonly');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm status change' }));
    await screen.findByText('User status updated');
    expect(within(dialog).getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('creates and edits a role with selected permissions', async () => {
    const source = renderAccess('/roles');
    fireEvent.click(await screen.findByRole('button', { name: 'Create Role' }));
    fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'Review team' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'audit.read' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save role' }));
    await screen.findByText('Role created');
    expect((await source.getRoles()).find(role => role.name === 'Review team')?.permissions).toEqual(['audit.read']);
    openFirstAction('View Role');
    fireEvent.click(screen.getByRole('button', { name: 'Edit role' }));
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated role description' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save role' }));
    await screen.findByText('Role updated');
    expect((await source.getRoles())[0].description).toBe('Updated role description');
  });

  it('creates an invitation and keeps validation errors inside the open form', async () => {
    const source = renderAccess('/invitations');
    fireEvent.click(await screen.findByRole('button', { name: 'Create Invitation' }));
    const dialog = screen.getByRole('dialog', { name: 'Create invitation' });
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'rani@digvation.id' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Role' }));
    fireEvent.click(screen.getByRole('option', { name: 'Operations Operator' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create invitation' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already belongs to a user');
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'review@example.com' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create invitation' }));
    await screen.findByText('Invitation created');
    expect((await source.getInvitations())[0]).toMatchObject({ email: 'review@example.com', roleId: 'role-ops' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirms revocation and removes the action after the invitation changes', async () => {
    const source = renderAccess('/invitations');
    await screen.findAllByText('dimas@digvation.id');
    openFirstAction('Revoke invitation');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Revoke invitation' }));
    await screen.findByText('Invitation revoked');
    expect((await source.getInvitations())[0].status).toBe('REVOKED');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders read-only audit detail and navigates between all ACCESS routes', async () => {
    renderAccess('/audit');
    await screen.findAllByText('Client lifecycle changed');
    openFirstAction('View audit detail');
    const dialog = screen.getByRole('dialog', { name: 'Audit detail' });
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Commercial review completed.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    for (const title of ['Users', 'Invitations', 'Roles', 'Audit']) {
      fireEvent.click(screen.getAllByRole('link', { name: title })[0]);
      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    }
  });

  it('shows a load failure and allows retry', async () => {
    renderAccess('/users');
    await screen.findAllByText('rani@digvation.id');
    vi.mocked(accessDataSource.getUsers).mockRejectedValueOnce(new Error('Unavailable'));
    fireEvent.click(screen.getAllByRole('link', { name: 'Roles' })[0]);
    await screen.findAllByText('Operations Operator');
    fireEvent.click(screen.getAllByRole('link', { name: 'Users' })[0]);
    await screen.findByText('Access data unavailable');
    const retry = screen.getByRole('button', { name: /retry|try again|coba lagi/i });
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getAllByText('rani@digvation.id').length).toBeGreaterThan(0));
  });
});
