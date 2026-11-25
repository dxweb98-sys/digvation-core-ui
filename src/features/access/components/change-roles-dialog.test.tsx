import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch, type RecordedCall } from '../../../test/fetch-mock';
import { renderApp, TEST_USER } from '../../../test/render-app';
import { UsersPage } from '../pages/users-page';

const base = {
  phone_number: null,
  email_verified_at: '2026-01-02T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  is_active: true,
};

const USERS = [
  { ...base, id: TEST_USER.id, fullname: TEST_USER.fullname, email: TEST_USER.email, username: 'ops', roles: ['ADMIN'] },
  { ...base, id: 'user-2', fullname: 'Rina Kusuma', email: 'rina@digvation.id', username: 'rina', roles: ['SUPPORT'] },
  { ...base, id: 'user-3', fullname: 'Sari Boss', email: 'sari@digvation.id', username: 'sari', roles: ['SUPER_ADMIN'] },
  { ...base, id: 'user-4', fullname: 'Fina Uang', email: 'fina@digvation.id', username: 'fina', roles: ['FINANCE'] },
];

const role = (slug: string, name: string, permissions: string[], extra: Record<string, unknown> = {}) => ({
  id: `role-${slug}`,
  slug,
  name,
  description: `${name} role`,
  is_system: false,
  is_active: true,
  user_count: 1,
  permissions,
  created_at: base.created_at,
  updated_at: base.updated_at,
  ...extra,
});

const ADMIN_PERMISSIONS = ['users.read', 'users.roles.manage', 'roles.read'];
const ROLES = [
  role('SUPER_ADMIN', 'Super Admin', ['*'], { is_system: true }),
  role('ADMIN', 'Admin', ADMIN_PERMISSIONS, { is_system: true }),
  role('SUPPORT', 'Dukungan', ['users.read']),
  role('FINANCE', 'Keuangan', ['billing.manage']),
  role('OLD', 'Lama', ['users.read'], { is_active: false }),
];

function serve(
  me: { roles: string[]; permissions: string[] },
  options: { onPut?: (call: RecordedCall) => Response; roles?: () => typeof ROLES; held?: string[] } = {},
) {
  return mockFetch((call) => {
    const path = call.url.replace('http://localhost:4002', '').split('?')[0];
    if (path === '/authorization/me') return envelope(me);
    if (path === '/users') return envelope({ items: USERS, pagination: { page: 1, limit: 20, total: USERS.length, total_pages: 1 } });
    if (path === '/roles') return envelope({ items: options.roles ? options.roles() : ROLES });
    const userRoles = path.match(/^\/users\/([^/]+)\/roles$/);
    if (userRoles && call.method === 'GET') {
      const user = USERS.find((item) => item.id === userRoles[1]);
      return envelope({ user_id: userRoles[1], roles: options.held ?? user?.roles ?? [] });
    }
    if (userRoles && call.method === 'PUT' && options.onPut) return options.onPut(call);
    return failure(404, 'NOT_FOUND');
  });
}

const ADMIN = { roles: ['ADMIN'], permissions: ADMIN_PERMISSIONS };
const SUPER = { roles: ['SUPER_ADMIN'], permissions: ['*'] };

const table = async () => within(await screen.findByRole('table'));

async function openMenu(name: string) {
  fireEvent.click(await (await table()).findByRole('button', { name: `Aksi untuk ${name}` }));
  return within(await screen.findByRole('menu'));
}

async function openDialog(name: string) {
  const menu = await openMenu(name);
  const item = menu.getByRole('menuitem', { name: /Ubah role/ });
  await waitFor(() => expect(item).toBeEnabled());
  fireEvent.click(item);
  return within(await screen.findByRole('dialog'));
}

const option = (dialog: ReturnType<typeof within>, name: string) =>
  dialog.getByRole('checkbox', { name: new RegExp(`^${name}`) });

afterEach(() => vi.unstubAllGlobals());

describe('change roles menu locks', () => {
  it('locks a Super Admin target and a target beyond the actor’s permissions', async () => {
    serve(ADMIN);
    renderApp(<UsersPage />);

    let menu = await openMenu('Sari Boss');
    await waitFor(() => expect(menu.getByRole('menuitem', { name: /Ubah role/ })).toBeDisabled());
    expect(menu.getByText('Hanya Super Admin yang bisa mengubah Super Admin')).toBeInTheDocument();
    fireEvent.keyDown(menu.getByRole('menuitem', { name: /Ubah role/ }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    menu = await openMenu('Fina Uang');
    await waitFor(() => expect(menu.getByRole('menuitem', { name: /Ubah role/ })).toBeDisabled());
    expect(menu.getByText('Pengguna ini punya izin yang tidak Anda miliki')).toBeInTheDocument();
    fireEvent.keyDown(menu.getByRole('menuitem', { name: /Ubah role/ }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    menu = await openMenu('Rina Kusuma');
    await waitFor(() => expect(menu.getByRole('menuitem', { name: 'Ubah role' })).toBeEnabled());
  });

  it('shows no locks to a Super Admin', async () => {
    serve(SUPER);
    renderApp(<UsersPage />);
    for (const name of ['Sari Boss', 'Fina Uang']) {
      const menu = await openMenu(name);
      await waitFor(() => expect(menu.getByRole('menuitem', { name: 'Ubah role' })).toBeEnabled());
      fireEvent.keyDown(menu.getByRole('menuitem', { name: 'Ubah role' }), { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    }
  });
});

describe('change roles dialog', () => {
  it('keeps save disabled while loading, then shows active roles with locks, counts and the selection', async () => {
    serve(ADMIN);
    renderApp(<UsersPage />);
    const dialog = await openDialog('Rina Kusuma');

    expect(dialog.getByText('Rina Kusuma · rina@digvation.id')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Simpan role' })).toBeDisabled();
    await waitFor(() => expect(option(dialog, 'Dukungan')).toBeChecked());

    expect(dialog.getByRole('group', { name: 'Role' })).toBeInTheDocument();
    expect(dialog.queryByRole('checkbox', { name: /^Lama/ })).not.toBeInTheDocument();
    expect(option(dialog, 'Super Admin')).toBeDisabled();
    expect(option(dialog, 'Super Admin')).toHaveAccessibleDescription('Hanya Super Admin yang bisa memberikan role ini.');
    expect(option(dialog, 'Keuangan')).toBeDisabled();
    expect(option(dialog, 'Keuangan')).toHaveAccessibleDescription('Berisi izin yang tidak Anda miliki.');
    expect(option(dialog, 'Admin')).toBeEnabled();
    expect(dialog.getByText('Semua izin')).toBeInTheDocument();
    expect(dialog.getByText('3 izin')).toBeInTheDocument();
    expect(dialog.getByText('Dipilih: Dukungan')).toBeInTheDocument();
    expect(dialog.getByText(/Rina tidak perlu masuk ulang/)).toBeInTheDocument();
  });

  it('enables save only on a change, and warns when no role is chosen', async () => {
    serve(ADMIN);
    renderApp(<UsersPage />);
    const dialog = await openDialog('Rina Kusuma');
    await waitFor(() => expect(option(dialog, 'Dukungan')).toBeChecked());
    const save = dialog.getByRole('button', { name: 'Simpan role' });

    fireEvent.click(option(dialog, 'Dukungan'));
    expect(save).toBeEnabled();
    expect(dialog.getByText('Tanpa role, Rina tidak bisa membuka halaman apa pun setelah masuk.')).toBeInTheDocument();

    fireEvent.click(option(dialog, 'Dukungan'));
    expect(save).toBeDisabled();
  });

  it('tells the operator when they change their own roles', async () => {
    serve(SUPER);
    renderApp(<UsersPage />);
    const dialog = await openDialog('Ops One');
    expect(await dialog.findByText('Anda mengubah role sendiri')).toBeInTheDocument();
  });

  it.each([
    ['LAST_SUPER_ADMIN', 'Rina adalah Super Admin aktif terakhir. Jadikan pengguna lain Super Admin dulu.'],
    ['ROLE_ASSIGNMENT_FORBIDDEN', 'Hanya Super Admin yang bisa memberikan atau mengubah role Super Admin.'],
    ['PERMISSION_NOT_GRANTABLE', 'Ada role yang berisi izin yang tidak Anda miliki.'],
  ])('maps %s to its alert', async (code, body) => {
    serve(ADMIN, { onPut: () => failure(403, code) });
    renderApp(<UsersPage />);
    const dialog = await openDialog('Rina Kusuma');
    await waitFor(() => expect(option(dialog, 'Admin')).toBeEnabled());

    fireEvent.click(option(dialog, 'Admin'));
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan role' }));
    expect(await dialog.findByText(body)).toBeInTheDocument();
  });

  it('reloads the roles on ROLE_NOT_ASSIGNABLE and drops the inactive choice', async () => {
    let rolesNow = ROLES;
    const { calls } = serve(ADMIN, {
      roles: () => rolesNow,
      onPut: () => {
        rolesNow = ROLES.map((item) => (item.slug === 'ADMIN' ? { ...item, is_active: false } : item));
        return failure(400, 'ROLE_NOT_ASSIGNABLE');
      },
    });
    renderApp(<UsersPage />);
    const dialog = await openDialog('Rina Kusuma');
    await waitFor(() => expect(option(dialog, 'Admin')).toBeEnabled());
    const roleLoads = calls.filter((call) => call.url.endsWith('/roles')).length;

    fireEvent.click(option(dialog, 'Admin'));
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan role' }));

    expect(await dialog.findByText('Daftar role berubah')).toBeInTheDocument();
    await waitFor(() => expect(dialog.queryByRole('checkbox', { name: /^Admin/ })).not.toBeInTheDocument());
    expect(calls.filter((call) => call.url.endsWith('/roles')).length).toBeGreaterThan(roleLoads);
    expect(dialog.getByText('Dipilih: Dukungan')).toBeInTheDocument();
  });

  it('saves, closes, refreshes the list and shows the toast', async () => {
    const { calls } = serve(ADMIN, { onPut: () => envelope({ message: 'ok', user_id: 'user-2', roles: ['ADMIN', 'SUPPORT'] }) });
    renderApp(<UsersPage />);
    const dialog = await openDialog('Rina Kusuma');
    await waitFor(() => expect(option(dialog, 'Admin')).toBeEnabled());
    const listLoads = calls.filter((call) => call.url.includes('/users?')).length;

    fireEvent.click(option(dialog, 'Admin'));
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan role' }));

    expect(await screen.findByText('Role Rina Kusuma diperbarui.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const write = calls.find((call) => call.method === 'PUT');
    expect(write?.url).toContain('/users/user-2/roles');
    expect(write?.body).toEqual({ role_slugs: ['SUPPORT', 'ADMIN'] });
    expect(calls.filter((call) => call.url.includes('/users?')).length).toBeGreaterThan(listLoads);
  });
});
