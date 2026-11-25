import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, failure, mockFetch, type RecordedCall } from '../../../test/fetch-mock';
import { renderApp } from '../../../test/render-app';
import { useInvitationsCopy } from '../invitations-copy';
import { validityText } from '../invitation-rules';
import { InvitationsPage } from './invitations-page';

const NOW = Date.parse('2026-11-25T03:00:00Z');
const inviter = { id: 'user-9', fullname: 'Rina Kusuma' };
const base = { invited_by: inviter, accepted_at: null, accepted_user_id: null, revoked_at: null, created_at: '2026-11-24T00:00:00Z' };

const INVITATIONS = [
  { ...base, id: 'inv-1', email: 'yoga@digvation.id', status: 'pending', expires_at: '2026-11-26T02:10:00Z' },
  { ...base, id: 'inv-2', email: 'sari@digvation.id', status: 'accepted', expires_at: '2026-11-16T00:00:00Z', accepted_at: '2026-11-15T02:12:00Z', accepted_user_id: 'user-5' },
  { ...base, id: 'inv-3', email: 'tono@digvation.id', status: 'expired', expires_at: '2026-11-21T08:00:00Z' },
  { ...base, id: 'inv-4', email: 'magang@gmail.com', status: 'revoked', expires_at: '2026-11-11T00:00:00Z', revoked_at: '2026-11-10T07:45:00Z' },
];

function serve(
  options: { permissions?: string[]; roles?: string[]; items?: typeof INVITATIONS; onWrite?: (call: RecordedCall) => Response } = {},
) {
  return mockFetch((call) => {
    const url = new URL(call.url);
    if (url.pathname === '/authorization/me')
      return envelope({ roles: options.roles ?? ['SUPER_ADMIN'], permissions: options.permissions ?? ['*'] });
    if (url.pathname === '/invitations' && call.method === 'GET') {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');
      const items = (options.items ?? INVITATIONS).filter(
        (item) => (!status || item.status === status) && (!search || item.email.includes(search)),
      );
      return envelope({ items, pagination: { page: 1, limit: 20, total: items.length, total_pages: 1 } });
    }
    if (url.pathname === '/users/user-5')
      return envelope({ id: 'user-5', fullname: 'Sari Wulandari', email: 'sari@digvation.id', username: 'sari', is_active: true, roles: [], phone_number: null, email_verified_at: null, created_at: '', updated_at: '' });
    if (url.pathname === '/users/user-5/roles') return envelope({ user_id: 'user-5', roles: [] });
    if (url.pathname === '/roles') return envelope({ items: [{ id: 'r1', slug: 'ADMIN', name: 'Admin', is_active: true, is_system: true, permission_count: 9 }] });
    if (options.onWrite && call.method !== 'GET') return options.onWrite(call);
    return failure(404, 'NOT_FOUND');
  });
}

const table = async () => within(await screen.findByRole('table'));
async function openMenu(email: string) {
  fireEvent.click(await (await table()).findByRole('button', { name: `Aksi untuk ${email}` }));
  return within(await screen.findByRole('menu'));
}
const invitationCalls = (calls: RecordedCall[]) => calls.filter((call) => call.url.includes('/invitations?'));

afterEach(() => vi.unstubAllGlobals());

describe('validity text', () => {
  it('reads each status from CORE instants', () => {
    let copy!: ReturnType<typeof useInvitationsCopy>;
    function Grab() {
      copy = useInvitationsCopy();
      return null;
    }
    renderApp(<Grab />);
    const [pending, accepted, expired, revoked] = INVITATIONS as never[];
    expect(validityText(pending, copy, NOW)[1]).toBe('23 jam lagi');
    expect(validityText({ ...(pending as object), expires_at: '2026-11-25T03:30:00Z' } as never, copy, NOW)[1]).toBe(
      'Kurang dari 1 jam lagi',
    );
    expect(validityText(accepted, copy, NOW)[0]).toMatch(/^Diterima 15 Nov 2026/);
    expect(validityText(expired, copy, NOW)[0]).toMatch(/^Berakhir 21 Nov 2026/);
    expect(validityText(revoked, copy, NOW)[0]).toMatch(/^Dicabut 10 Nov 2026/);
  });
});

describe('invitations list', () => {
  it('sends status and search to CORE and shows the total', async () => {
    const { calls } = serve();
    renderApp(<InvitationsPage />);
    expect(await (await table()).findByText('yoga@digvation.id')).toBeInTheDocument();
    expect(screen.getByText('4 undangan')).toBeInTheDocument();
    expect(screen.queryByText('Anda hanya melihat undangan yang Anda kirim.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undang pengguna' })).not.toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'Status' });
    fireEvent.click(within(group).getByRole('button', { name: 'Menunggu' }));
    await waitFor(() => expect(invitationCalls(calls).some((call) => call.url.includes('status=pending'))).toBe(true));
    await waitFor(() => expect(screen.getByText('1 undangan')).toBeInTheDocument());

    fireEvent.change(screen.getAllByPlaceholderText('Cari email')[0], { target: { value: 'yoga' } });
    await waitFor(() => expect(invitationCalls(calls).some((call) => call.url.includes('search=yoga'))).toBe(true), {
      timeout: 2000,
    });
  });

  it('shows the own-only line to an operator who is not a Super Admin', async () => {
    serve({ roles: ['ADMIN'], permissions: ['users.invite'] });
    renderApp(<InvitationsPage />);
    expect(await screen.findByText('Anda hanya melihat undangan yang Anda kirim.')).toBeInTheDocument();
  });

  it('shows the empty state without a toolbar', async () => {
    serve({ items: [] });
    renderApp(<InvitationsPage />);
    expect(await screen.findByText('Belum ada undangan')).toBeInTheDocument();
    expect(screen.getByText('Undangan muncul di sini setelah Anda mengundang operator dari halaman Pengguna.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buka Pengguna' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Cari email')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undang pengguna' })).not.toBeInTheDocument();
  });

  it('hides "Buka Pengguna" without users.read', async () => {
    serve({ items: [], roles: ['ADMIN'], permissions: ['users.invite'] });
    renderApp(<InvitationsPage />);
    expect(await screen.findByText('Belum ada undangan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Buka Pengguna' })).not.toBeInTheDocument();
  });

  it('shows no-match with a clear filters action', async () => {
    serve({ items: INVITATIONS.slice(0, 1) });
    renderApp(<InvitationsPage />);
    await (await table()).findByText('yoga@digvation.id');
    fireEvent.click(within(screen.getByRole('group', { name: 'Status' })).getByRole('button', { name: 'Dicabut' }));
    expect((await screen.findAllByText('Tidak ada undangan yang cocok'))[0]).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Hapus filter' })[0]);
    expect(await (await table()).findByText('yoga@digvation.id')).toBeInTheDocument();
  });
});

describe('row menu', () => {
  it('offers items per status and per permission', async () => {
    serve();
    renderApp(<InvitationsPage />);
    let menu = await openMenu('yoga@digvation.id');
    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Cabut undangan']);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    menu = await openMenu('sari@digvation.id');
    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Beri role', 'Lihat di Pengguna']);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    menu = await openMenu('tono@digvation.id');
    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Kirim ulang']);
  });

  it('hides accepted items the operator may not use', async () => {
    serve({ roles: ['ADMIN'], permissions: ['users.invite'] });
    renderApp(<InvitationsPage />);
    await (await table()).findByText('sari@digvation.id');
    expect((await table()).queryByRole('button', { name: 'Aksi untuk sari@digvation.id' })).not.toBeInTheDocument();
  });

  it('"Beri role" opens the change roles dialog for accepted_user_id', async () => {
    const { calls } = serve();
    renderApp(<InvitationsPage />);
    fireEvent.click((await openMenu('sari@digvation.id')).getByRole('menuitem', { name: 'Beri role' }));
    expect(await screen.findByRole('dialog', { name: /Ubah role/ })).toBeInTheDocument();
    expect(calls.some((call) => call.url.endsWith('/users/user-5'))).toBe(true);
    expect(screen.getByText('Sari Wulandari · sari@digvation.id')).toBeInTheDocument();
  });

  it('"Kirim ulang" opens the invite dialog with the email filled in', async () => {
    serve();
    renderApp(<InvitationsPage />);
    fireEvent.click((await openMenu('tono@digvation.id')).getByRole('menuitem', { name: 'Kirim ulang' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByLabelText('Email')).toHaveValue('tono@digvation.id');
  });
});

describe('revoke', () => {
  it('revokes and announces it', async () => {
    const { calls } = serve({ onWrite: () => envelope({ message: 'ok', invitation_id: 'inv-1' }) });
    renderApp(<InvitationsPage />);
    fireEvent.click((await openMenu('yoga@digvation.id')).getByRole('menuitem', { name: 'Cabut undangan' }));
    expect(await screen.findByText(/Tautan yang dikirim ke yoga@digvation.id tidak bisa dipakai lagi/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cabut undangan' }));
    expect(await screen.findByText('Undangan untuk yoga@digvation.id dicabut.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'DELETE' && call.url.endsWith('/invitations/inv-1'))).toBe(true);
  });

  it.each([
    ['INVITATION_ALREADY_ACCEPTED', 'Undangan ini sudah diterima, jadi tidak bisa dicabut.'],
    ['INVITATION_ALREADY_REVOKED', 'Undangan ini sudah dicabut sebelumnya.'],
    ['CONFLICT', 'Undangan ini baru saja berubah. Daftar dimuat ulang.'],
  ])('closes and explains %s', async (code, message) => {
    const { calls } = serve({ onWrite: () => failure(409, code) });
    renderApp(<InvitationsPage />);
    fireEvent.click((await openMenu('yoga@digvation.id')).getByRole('menuitem', { name: 'Cabut undangan' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cabut undangan' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(invitationCalls(calls).length).toBeGreaterThan(1);
  });
});

