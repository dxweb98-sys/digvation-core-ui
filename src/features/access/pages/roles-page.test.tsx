import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch, type RecordedCall } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { openFilter } from '../../../test/table';
import { RolesPage } from './roles-page';

const role = (slug: string, name: string, permissions: string[], extra: Record<string, unknown> = {}) => ({
  id: `role-${slug}`,
  slug,
  name,
  description: `${name} role`,
  is_system: false,
  is_active: true,
  user_count: 2,
  permissions,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...extra,
});

const ROLES = [
  role('SUPER_ADMIN', 'Super Admin', ['*'], { is_system: true, user_count: 1 }),
  role('ADMIN', 'Admin', ['users.read', 'roles.read'], { is_system: true }),
  role('SUPPORT', 'Dukungan', ['users.read']),
  role('OLD', 'Lama', [], { is_active: false, user_count: 0 }),
];

const CATALOG = [
  'users.read',
  'users.invite',
  'roles.read',
  'roles.permissions.manage',
  'permissions.read',
  'clients.read',
  'billing.read',
].map((slug) => ({ id: slug, slug, name: `Backend ${slug}` }));

const ADMIN_PERMISSIONS = [
  'users.read',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  'roles.permissions.manage',
  'permissions.read',
];

function serve(
  me: { roles: string[]; permissions: string[] },
  write?: (call: RecordedCall, path: string) => Response,
) {
  return mockFetch((call) => {
    const path = call.url.replace('http://localhost:4002', '').split('?')[0];
    if (call.method === 'GET') {
      if (path === '/authorization/me') return envelope(me);
      if (path === '/roles') return envelope({ items: ROLES });
      if (path === '/permissions') return envelope({ items: CATALOG });
      const held = path.match(/^\/roles\/role-([A-Z_]+)\/permissions$/);
      if (held) return envelope({ role_id: `role-${held[1]}`, role_slug: held[1], permissions: ROLES.find((r) => r.slug === held[1])?.permissions ?? [] });
    }
    if (write) return write(call, path);
    return failure(404, 'NOT_FOUND');
  });
}

const ADMIN = { roles: ['ADMIN'], permissions: ADMIN_PERMISSIONS };
const SUPER = { roles: ['SUPER_ADMIN'], permissions: ['*'] };

const table = async () => within(await screen.findByRole('table'));

async function openMenu(name: string) {
  fireEvent.click(await (await table()).findByRole('button', { name: `Aksi untuk role ${name}` }));
  return within(await screen.findByRole('menu'));
}

async function openItem(name: string, item: RegExp) {
  const menu = await openMenu(name);
  const entry = menu.getByRole('menuitem', { name: item });
  await waitFor(() => expect(entry).toBeEnabled());
  fireEvent.click(entry);
  return within(await screen.findByRole('dialog'));
}

afterEach(() => vi.unstubAllGlobals());

describe('roles list', () => {
  it('shows types, users, permission counts and filters by status in the browser', async () => {
    serve(ADMIN);
    renderApp(<RolesPage />);
    const rows = await table();

    expect(await rows.findByText('Semua izin')).toBeInTheDocument();
    expect(await rows.findByText('2 dari 7')).toBeInTheDocument();
    expect(rows.getAllByText('Sistem')).toHaveLength(2);
    expect(screen.getByText('4 role')).toBeInTheDocument();

    openFilter('Status');
    expect(await screen.findByRole('option', { name: 'Semua (4)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Aktif (3)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Nonaktif (1)' }));
    expect(await screen.findByText('1 role · Status: Nonaktif')).toBeInTheDocument();
    expect((await table()).getByText('Lama')).toBeInTheDocument();
    expect((await table()).queryByText('Dukungan')).not.toBeInTheDocument();
  });

  it('locks the row items with the approved hints', async () => {
    serve(ADMIN);
    renderApp(<RolesPage />);

    let menu = await openMenu('Super Admin');
    expect(menu.getByText('Super Admin selalu punya semua izin')).toBeInTheDocument();
    expect(menu.queryByRole('menuitem', { name: /Ubah nama/ })).not.toBeInTheDocument();
    fireEvent.keyDown(menu.getByRole('menuitem', { name: /Atur izin/ }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    menu = await openMenu('Admin');
    expect(menu.getByText('Hanya Super Admin yang bisa mengubah izin role sistem')).toBeInTheDocument();
    fireEvent.keyDown(menu.getByRole('menuitem', { name: /Atur izin/ }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    menu = await openMenu('Lama');
    expect(menu.getByRole('menuitem', { name: /Atur izin/ })).toBeDisabled();
    expect(menu.getByText('Aktifkan role ini dulu')).toBeInTheDocument();
    expect(menu.getByRole('menuitem', { name: 'Aktifkan kembali' })).toBeEnabled();
  });
});

describe('permission editor', () => {
  it('groups the catalog, puts unknown slugs under Lainnya, and locks what the actor lacks', async () => {
    serve(ADMIN);
    renderApp(<RolesPage />);
    const dialog = await openItem('Dukungan', /Atur izin/);

    expect(await dialog.findByText('1 dari 7 izin dipilih')).toBeInTheDocument();
    for (const name of ['Pengguna', 'Role dan izin', 'Klien', 'Lainnya']) {
      expect(dialog.getByRole('group', { name })).toBeInTheDocument();
    }
    const roles = within(dialog.getByRole('group', { name: 'Role dan izin' }));
    expect(roles.getByRole('checkbox', { name: /Lihat daftar izin/ })).toBeEnabled();
    expect(within(dialog.getByRole('group', { name: 'Lainnya' })).getByText('Backend billing.read')).toBeInTheDocument();

    const invite = dialog.getByRole('checkbox', { name: /Undang pengguna/ });
    expect(invite).toBeDisabled();
    expect(invite).toHaveAccessibleDescription('Anda tidak memiliki izin ini');
    expect(dialog.getByText(/untuk 2 pengguna/)).toBeInTheDocument();
  });

  it('select all and clear change unlocked permissions only; save follows the change', async () => {
    serve(ADMIN);
    renderApp(<RolesPage />);
    const dialog = await openItem('Dukungan', /Atur izin/);
    const users = within(await dialog.findByRole('group', { name: 'Pengguna' }));
    const save = dialog.getByRole('button', { name: 'Simpan izin' });
    expect(save).toBeDisabled();

    // Pengguna: users.read (held, unlocked) and users.invite (locked) — every unlocked one is chosen.
    fireEvent.click(users.getByRole('button', { name: 'Kosongkan' }));
    expect(users.getByRole('checkbox', { name: /Lihat pengguna/ })).not.toBeChecked();
    expect(users.getByRole('checkbox', { name: /Undang pengguna/ })).not.toBeChecked();
    expect(save).toBeEnabled();

    fireEvent.click(users.getByRole('button', { name: 'Pilih semua' }));
    expect(users.getByRole('checkbox', { name: /Lihat pengguna/ })).toBeChecked();
    expect(users.getByRole('checkbox', { name: /Undang pengguna/ })).not.toBeChecked();
    expect(save).toBeDisabled();
  });

  it.each([
    ['ROLE_INACTIVE', 'Aktifkan role ini dulu sebelum mengubah izinnya.'],
    ['ROLE_SYSTEM_IMMUTABLE', 'Hanya Super Admin yang bisa mengubah izin role sistem.'],
    ['PERMISSION_NOT_GRANTABLE', 'Ada izin yang tidak Anda miliki.'],
  ])('maps %s to its alert', async (code, body) => {
    serve(ADMIN, () => failure(400, code));
    renderApp(<RolesPage />);
    const dialog = await openItem('Dukungan', /Atur izin/);
    fireEvent.click(await dialog.findByRole('checkbox', { name: /^Lihat role roles.read/ }));
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan izin' }));
    expect(await dialog.findByText(body)).toBeInTheDocument();
  });

  it('saves, refreshes the list and shows the toast', async () => {
    const { calls } = serve(SUPER, () => envelope({ message: 'ok', role_id: 'role-SUPPORT', permissions: [] }));
    renderApp(<RolesPage />);
    const dialog = await openItem('Dukungan', /Atur izin/);
    fireEvent.click(await dialog.findByRole('checkbox', { name: /Undang pengguna/ }));
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan izin' }));

    expect(await screen.findByText('Izin role Dukungan diperbarui.')).toBeInTheDocument();
    const write = calls.find((call) => call.method === 'PUT');
    expect(write?.url).toContain('/roles/role-SUPPORT/permissions');
    expect(write?.body).toEqual({ permission_slugs: ['users.read', 'users.invite'] });
  });
});

describe('create role', () => {
  async function openCreate() {
    fireEvent.click(await screen.findByRole('button', { name: 'Buat role' }));
    return within(await screen.findByRole('dialog'));
  }

  it('requires name and slug, and fills the slug from the name until it is edited', async () => {
    const { calls } = serve(ADMIN);
    renderApp(<RolesPage />);
    const dialog = await openCreate();

    fireEvent.click(dialog.getByRole('button', { name: 'Buat role' }));
    expect(await dialog.findByText('Isi nama role.')).toBeInTheDocument();
    expect(dialog.getByText('Isi slug.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'POST')).toBe(false);

    const name = dialog.getByRole('textbox', { name: 'Nama role' });
    const slug = dialog.getByRole('textbox', { name: 'Slug' });
    fireEvent.change(name, { target: { value: 'Operasional klien' } });
    expect(slug).toHaveValue('OPERASIONAL_KLIEN');

    fireEvent.change(slug, { target: { value: 'ops_klien' } });
    fireEvent.change(name, { target: { value: 'Operasional klien baru' } });
    expect(slug).toHaveValue('OPS_KLIEN');
  });

  it('shows a slug conflict under the slug field and focuses it', async () => {
    serve(ADMIN, () => failure(409, 'ROLE_SLUG_CONFLICT'));
    renderApp(<RolesPage />);
    const dialog = await openCreate();
    fireEvent.change(dialog.getByRole('textbox', { name: 'Nama role' }), { target: { value: 'Dukungan' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Buat role' }));

    const slug = dialog.getByRole('textbox', { name: 'Slug' });
    await waitFor(() => expect(slug).toHaveAttribute('aria-invalid', 'true'));
    expect(slug).toHaveAccessibleDescription('Slug ini sudah dipakai role lain.');
    await waitFor(() => expect(slug).toHaveFocus());
  });

  it('explains that permissions come later without roles.permissions.manage', async () => {
    serve({ roles: ['ADMIN'], permissions: ['roles.read', 'roles.create'] });
    renderApp(<RolesPage />);
    const dialog = await openCreate();
    expect(dialog.getByText('Izin diatur nanti')).toBeInTheDocument();
    expect(dialog.queryByRole('group', { name: 'Pengguna' })).not.toBeInTheDocument();
  });
});

describe('edit and lifecycle', () => {
  it('enables save only when name or description changes', async () => {
    const { calls } = serve(ADMIN, () => envelope({ message: 'ok', role_id: 'role-SUPPORT' }));
    renderApp(<RolesPage />);
    const dialog = await openItem('Dukungan', /Ubah nama/);
    const save = dialog.getByRole('button', { name: 'Simpan' });
    expect(save).toBeDisabled();

    fireEvent.change(dialog.getByRole('textbox', { name: 'Nama role' }), { target: { value: 'Dukungan pelanggan' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(await screen.findByText('Role Dukungan pelanggan diperbarui.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      name: 'Dukungan pelanggan',
      description: 'Dukungan role',
    });
  });

  it('confirms deactivation with the user count, and reactivation with PATCH', async () => {
    const { calls } = serve(ADMIN, () => envelope({ message: 'ok', role_id: 'x' }));
    renderApp(<RolesPage />);

    let dialog = await openItem('Dukungan', /Nonaktifkan role/);
    expect(dialog.getByText(/^2 pengguna memakai role ini/)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Nonaktifkan role' }));
    expect(await screen.findByText('Role Dukungan dinonaktifkan.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'DELETE')?.url).toContain('/roles/role-SUPPORT');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    dialog = await openItem('Lama', /Aktifkan kembali/);
    fireEvent.click(dialog.getByRole('button', { name: 'Aktifkan kembali' }));
    expect(await screen.findByText('Role Lama diaktifkan kembali.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ is_active: true });
  });

  it('uses the 0-user message for a role nobody has', async () => {
    serve(ADMIN);
    const custom = ROLES.find((item) => item.slug === 'SUPPORT')!;
    const original = custom.user_count;
    custom.user_count = 0;
    try {
      renderApp(<RolesPage />);
      const dialog = await openItem('Dukungan', /Nonaktifkan role/);
      expect(dialog.getByText(/^Belum ada pengguna yang memakai role ini/)).toBeInTheDocument();
    } finally {
      custom.user_count = original;
    }
  });
});
