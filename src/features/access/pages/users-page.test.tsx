import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch, type RecordedCall } from '../../../test/fetch-mock';
import { renderApp, TEST_USER } from '../../../test/render-app';
import { UsersPage } from './users-page';

const base = {
  phone_number: null,
  email_verified_at: '2026-01-02T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const USERS = [
  { ...base, id: TEST_USER.id, fullname: TEST_USER.fullname, email: TEST_USER.email, username: 'ops', is_active: true, roles: ['ADMIN'] },
  { ...base, id: 'user-2', fullname: 'Rina Kusuma', email: 'rina@digvation.id', username: 'rina', is_active: true, email_verified_at: null, roles: ['SUPPORT'] },
  { ...base, id: 'user-3', fullname: 'Sari Boss', email: 'sari@digvation.id', username: 'sari', is_active: true, roles: ['SUPER_ADMIN'] },
  { ...base, id: 'user-4', fullname: 'Andi Setiawan', email: 'andi@digvation.id', username: 'andi', is_active: false, roles: [] },
];

function serve(
  permissions: string[],
  options: { onWrite?: (call: RecordedCall) => Response; users?: (call: RecordedCall) => Response; pending?: number } = {},
) {
  return mockFetch((call) => {
    const path = call.url.replace('http://localhost:4002', '').split('?')[0];
    if (path === '/authorization/me') return envelope({ roles: ['ADMIN'], permissions });
    if (path === '/users') {
      if (options.users) return options.users(call);
      const search = new URL(call.url).searchParams.get('search');
      const items = search ? USERS.filter((user) => user.fullname.toLowerCase().includes(search)) : USERS;
      return envelope({ items, pagination: { page: 1, limit: 20, total: items.length, total_pages: 1 } });
    }
    if (path === '/roles') return envelope({ items: [{ slug: 'SUPPORT', name: 'Dukungan', is_active: true }] });
    if (path === '/invitations') {
      return envelope({ items: [], pagination: { page: 1, limit: 1, total: options.pending ?? 0, total_pages: 1 } });
    }
    if (options.onWrite && call.method !== 'GET') return options.onWrite(call);
    return failure(404, 'NOT_FOUND');
  });
}

// DDataTable renders mobile cards and the desktop table; jsdom shows both, so tests read the table.
const table = async () => within(await screen.findByRole('table'));

const actionsFor = async (name: string) => (await table()).findByRole('button', { name: `Aksi untuk ${name}` });

async function openActions(name: string) {
  fireEvent.click(await actionsFor(name));
  return screen.findByRole('menu');
}

afterEach(() => vi.unstubAllGlobals());

describe('users list', () => {
  it('shows identity, role names, status and no actions for a read-only operator', async () => {
    serve(['users.read', 'roles.read']);
    renderApp(<UsersPage />);

    const rows = await table();
    expect(await rows.findByText('Rina Kusuma')).toBeInTheDocument();
    expect(rows.getByText('Anda')).toBeInTheDocument();
    expect(await rows.findByText('Dukungan')).toBeInTheDocument();
    expect(rows.getByText('SUPER_ADMIN')).toBeInTheDocument();
    expect(rows.getByText('Tanpa role')).toBeInTheDocument();
    expect(rows.getByText('Email belum diverifikasi')).toBeInTheDocument();
    expect(rows.getByText('Nonaktif')).toBeInTheDocument();
    expect(screen.getByText('4 pengguna')).toBeInTheDocument();
    expect(rows.queryByRole('button', { name: /Aksi untuk/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undang pengguna' })).not.toBeInTheDocument();
  });

  it('links the pending invitations only with users.invite', async () => {
    serve(['users.read', 'users.invite'], { pending: 2 });
    renderApp(<UsersPage />);
    expect(await screen.findByRole('link', { name: '2 undangan tertunda' })).toHaveAttribute('href', '/invitations');
    expect(screen.getByRole('button', { name: 'Undang pengguna' })).toBeInTheDocument();
  });

  it('offers only the actions the operator holds', async () => {
    serve(['users.read', 'users.roles.manage']);
    renderApp(<UsersPage />);
    const menu = await openActions('Rina Kusuma');
    expect(within(menu).getByRole('menuitem', { name: 'Ubah role' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: /Nonaktifkan/ })).not.toBeInTheDocument();
  });

  it('disables deactivating yourself and a Super Admin, with the reason', async () => {
    serve(['users.read', 'users.lifecycle.manage']);
    renderApp(<UsersPage />);

    let menu = await openActions('Ops One');
    expect(within(menu).getByRole('menuitem', { name: /Nonaktifkan/ })).toBeDisabled();
    expect(within(menu).getByText('Tidak bisa untuk akun sendiri')).toBeInTheDocument();
    fireEvent.keyDown(menu.firstElementChild as HTMLElement, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    menu = await openActions('Sari Boss');
    expect(within(menu).getByRole('menuitem', { name: /Nonaktifkan/ })).toBeDisabled();
    expect(within(menu).getByText('Hanya Super Admin yang bisa menonaktifkan Super Admin')).toBeInTheDocument();
  });

  it('shows the load error with a retry', async () => {
    let fail = true;
    const { calls } = serve(['users.read'], {
      users: () =>
        fail
          ? failure(500, 'INTERNAL_ERROR')
          : envelope({ items: USERS, pagination: { page: 1, limit: 20, total: 4, total_pages: 1 } }),
    });
    renderApp(<UsersPage />);

    expect(await (await table()).findByRole('alert')).toHaveTextContent('Daftar pengguna belum bisa dimuat');
    fail = false;
    fireEvent.click((await table()).getByRole('button', { name: 'Coba lagi' }));
    expect(await (await table()).findByText('Rina Kusuma')).toBeInTheDocument();
    expect(calls.filter((call) => call.url.includes('/users?')).length).toBeGreaterThanOrEqual(2);
  });

  it('shows the no-match state and clears the search', async () => {
    const { calls } = serve(['users.read']);
    renderApp(<UsersPage />);
    await (await table()).findByText('Rina Kusuma');

    fireEvent.change(screen.getAllByPlaceholderText('Cari nama, email, atau username')[0], { target: { value: 'yoga' } });
    const rows = await table();
    expect(await rows.findByText('Tidak ada pengguna yang cocok', undefined, { timeout: 2000 })).toBeInTheDocument();
    expect(calls.some((call) => call.url.includes('search=yoga'))).toBe(true);

    fireEvent.click(rows.getByRole('button', { name: 'Hapus pencarian' }));
    expect(await (await table()).findByText('Rina Kusuma')).toBeInTheDocument();
  });
});

describe('deactivate and reactivate', () => {
  async function openDialog(name: string, label: RegExp) {
    const menu = await openActions(name);
    fireEvent.click(within(menu).getByRole('menuitem', { name: label }));
    return screen.findByRole('dialog');
  }

  it('requires a reason before calling CORE', async () => {
    const { calls } = serve(['users.read', 'users.lifecycle.manage']);
    renderApp(<UsersPage />);
    const dialog = await openDialog('Rina Kusuma', /Nonaktifkan/);

    expect(within(dialog).getByText('Nonaktifkan Rina Kusuma?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Nonaktifkan' }));
    const reason = within(dialog).getByRole('textbox', { name: 'Alasan' });
    await waitFor(() => expect(reason).toHaveAttribute('aria-invalid', 'true'));
    expect(within(dialog).getByText('Isi alasan.')).toBeInTheDocument();
    await waitFor(() => expect(reason).toHaveFocus());
    expect(calls.some((call) => call.method === 'PATCH')).toBe(false);
  });

  it.each([
    ['LAST_SUPER_ADMIN', 'Ini Super Admin aktif terakhir. Jadikan pengguna lain Super Admin dulu.'],
    ['USER_STATUS_FORBIDDEN', 'Hanya Super Admin yang bisa menonaktifkan Super Admin.'],
    ['USER_INVALID_TRANSITION', 'Pengguna ini sudah dalam status tersebut. Muat ulang daftar.'],
  ])('maps %s to its alert', async (code, body) => {
    serve(['users.read', 'users.lifecycle.manage'], { onWrite: () => failure(409, code) });
    renderApp(<UsersPage />);
    const dialog = await openDialog('Rina Kusuma', /Nonaktifkan/);

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Alasan' }), { target: { value: 'Left' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Nonaktifkan' }));
    expect(await within(dialog).findByText(body)).toBeInTheDocument();
  });

  it('reactivates, closes, refreshes the list and shows the toast', async () => {
    const { calls } = serve(['users.read', 'users.lifecycle.manage'], {
      onWrite: () => envelope({ id: 'user-4', is_active: true }),
    });
    renderApp(<UsersPage />);
    const dialog = await openDialog('Andi Setiawan', /Aktifkan kembali/);
    const listLoads = calls.filter((call) => call.url.includes('/users?')).length;

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Alasan' }), { target: { value: 'Back on duty' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aktifkan kembali' }));

    expect(await screen.findByText('Andi Setiawan diaktifkan kembali.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const write = calls.find((call) => call.method === 'PATCH');
    expect(write?.url).toContain('/users/user-4/status');
    expect(write?.body).toEqual({ is_active: true, reason: 'Back on duty' });
    expect(calls.filter((call) => call.url.includes('/users?')).length).toBeGreaterThan(listLoads);
  });
});
