import { DLocalizationProvider, DToastProvider } from '@digvation/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router';
import { applicationRoutes } from '../../../app/router/application-routes';
import { ApplicationShell } from '../../../app/shell/application-shell';
import { setDisplayLocale } from '../../../shared/format/locale';
import { envelope, failure, mockFetch, type RecordedCall } from '../../../test/fetch-mock';
import { AuthProvider } from '../../auth/auth-provider';
import { RequireAuthentication } from '../../auth/components/require-authentication';
import { LoginPage } from '../../auth/pages/login-page';

const ME = {
  id: 'user-1',
  fullname: 'Dicky Darmawan',
  email: 'dicky@digvation.id',
  username: 'dicky',
  phone_number: '+628111',
  is_active: true,
  email_verified_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

interface Options {
  roles?: string[];
  permissions?: string[];
  write?: (call: RecordedCall) => Response;
}

/** CORE for a signed-in operator: a restorable session, the profile and the role catalog. */
function serve({ roles = ['SUPER_ADMIN'], permissions = ['*'], write }: Options = {}) {
  return mockFetch((call) => {
    const path = new URL(call.url).pathname;
    if (path === '/auth/refresh')
      return envelope({ access_token: 'access', csrf_token: 'csrf', remember_me: false, user: ME });
    if (path === '/users/me' && call.method === 'GET') return envelope(ME);
    if (path === '/authorization/me') return envelope({ roles, permissions });
    if (path === '/roles') return envelope({ items: [{ id: 'r1', slug: 'SUPER_ADMIN', name: 'Super Admin', is_active: true }] });
    if (path === '/invitations') return envelope({ items: [], pagination: { page: 1, limit: 1, total: 0, total_pages: 1 } });
    if (write && call.method !== 'GET') return write(call);
    return failure(404, 'NOT_FOUND');
  });
}

function providers(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <DLocalizationProvider locale="id-ID">
        <DToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </DToastProvider>
      </DLocalizationProvider>
    </QueryClientProvider>
  );
}

/** The signed-in shell on /users, with the real sign-in page behind it. */
function renderShell() {
  render(
    providers(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuthentication>
                <ApplicationShell />
              </RequireAuthentication>
            }
          >
            <Route path="users" element={<p>Daftar pengguna</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    ),
  );
}

const accountButton = () => screen.findByRole('button', { name: /Menu akun/ });

async function openProfile() {
  fireEvent.click(await accountButton());
  fireEvent.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Profil saya' }));
  return within(await screen.findByRole('dialog'));
}

async function openPasswordTab() {
  const dialog = await openProfile();
  fireEvent.click(dialog.getByRole('tab', { name: 'Kata sandi' }));
  return dialog;
}

const writes = (calls: RecordedCall[], path: string) =>
  calls.filter((call) => call.method !== 'GET' && new URL(call.url).pathname === path);

beforeEach(() => {
  setDisplayLocale('id-ID');
  sessionStorage.setItem('digvation-core.csrf.session', 'csrf');
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

describe('profile dialog', () => {
  it('opens from the account menu with the header, roles and full-width tabs', async () => {
    serve();
    renderShell();
    const dialog = await openProfile();

    expect(dialog.getByRole('heading', { name: 'Profil saya' })).toBeInTheDocument();
    expect(dialog.getByText('Dicky Darmawan')).toBeInTheDocument();
    expect(dialog.getByText('dicky@digvation.id')).toBeInTheDocument();
    expect(await dialog.findByText('Super Admin')).toBeInTheDocument();
    expect(dialog.getByRole('tablist')).toBeInTheDocument();
    expect(dialog.getByRole('tab', { name: 'Profil' })).toHaveAttribute('aria-selected', 'true');
    expect(dialog.getByRole('tabpanel')).toBeInTheDocument();
    expect(dialog.getByLabelText('Nama lengkap')).toHaveValue('Dicky Darmawan');
  });

  it('labels system roles for an operator who cannot read roles, and keeps custom slugs', async () => {
    const { calls } = serve({ roles: ['ADMIN', 'OPS_CUSTOM'], permissions: ['users.read'] });
    renderShell();
    const dialog = await openProfile();
    expect(await dialog.findByText('Admin')).toBeInTheDocument();
    expect(dialog.getByText('OPS_CUSTOM')).toBeInTheDocument();
    expect(dialog.queryByText('ADMIN')).not.toBeInTheDocument();
    expect(calls.some((call) => new URL(call.url).pathname === '/roles')).toBe(false);
  });

  it('shows "Belum punya role" for an account without roles', async () => {
    serve({ roles: [] });
    renderShell();
    const dialog = await openProfile();
    expect(await dialog.findByText('Belum punya role')).toBeInTheDocument();
  });

  it('saves only the changed fields, sends an emptied phone as "", and renames the account menu', async () => {
    const { calls } = serve({
      write: (call) => envelope({ message: 'ok', user: { ...ME, ...(call.body as object), phone_number: null } }),
    });
    renderShell();
    const dialog = await openProfile();
    const save = dialog.getByRole('button', { name: 'Simpan profil' });
    expect(save).toBeDisabled();

    fireEvent.change(dialog.getByLabelText('Nama lengkap'), { target: { value: 'Dicky D.' } });
    fireEvent.change(dialog.getByLabelText(/Nomor telepon/), { target: { value: '' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(writes(calls, '/users/me')).toHaveLength(1));
    expect(writes(calls, '/users/me')[0].body).toEqual({ fullname: 'Dicky D.', phone_number: '' });
    expect(await screen.findByText('Profil disimpan.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Menu akun: Dicky D.' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Menu akun: Dicky D.' })).toHaveFocus());
  });

  it('keeps Simpan disabled when a change is undone', async () => {
    serve();
    renderShell();
    const dialog = await openProfile();
    const name = dialog.getByLabelText('Nama lengkap');
    fireEvent.change(name, { target: { value: 'Other' } });
    fireEvent.change(name, { target: { value: 'Dicky Darmawan' } });
    expect(dialog.getByRole('button', { name: 'Simpan profil' })).toBeDisabled();
  });

  it('checks name and username in the browser, focusing the first invalid field', async () => {
    const { calls } = serve();
    renderShell();
    const dialog = await openProfile();
    fireEvent.change(dialog.getByLabelText('Nama lengkap'), { target: { value: ' ' } });
    fireEvent.change(dialog.getByLabelText('Username'), { target: { value: 'a b' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan profil' }));

    expect(await dialog.findByText('Isi nama lengkap.')).toBeInTheDocument();
    expect(dialog.getByText(/Username hanya boleh huruf kecil/)).toBeInTheDocument();
    const name = dialog.getByLabelText('Nama lengkap');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name.getAttribute('aria-describedby')).toBeTruthy();
    await waitFor(() => expect(name).toHaveFocus());
    expect(writes(calls, '/users/me')).toHaveLength(0);
  });

  it('shows a taken username under the field', async () => {
    serve({ write: () => failure(409, 'RESOURCE_CONFLICT', [{ field: 'username', message: 'taken' }]) });
    renderShell();
    const dialog = await openProfile();
    fireEvent.change(dialog.getByLabelText('Username'), { target: { value: 'rina' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan profil' }));

    expect(await dialog.findByText('Username ini sudah dipakai. Coba yang lain.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows too many attempts as a danger alert', async () => {
    serve({ write: () => failure(429, 'TOO_MANY_REQUESTS') });
    renderShell();
    const dialog = await openProfile();
    fireEvent.change(dialog.getByLabelText('Nama lengkap'), { target: { value: 'New' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan profil' }));
    expect(await dialog.findByText('Terlalu banyak percobaan')).toBeInTheDocument();
  });

  it('drops the tab errors when switching tabs', async () => {
    serve();
    renderShell();
    const dialog = await openPasswordTab();
    fireEvent.click(dialog.getByRole('button', { name: 'Ganti kata sandi' }));
    expect(await dialog.findByText('Isi kata sandi saat ini.')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('tab', { name: 'Profil' }));
    fireEvent.click(dialog.getByRole('tab', { name: 'Kata sandi' }));
    expect(dialog.queryByText('Isi kata sandi saat ini.')).not.toBeInTheDocument();
  });
});

describe('password tab', () => {
  async function fill(dialog: ReturnType<typeof within>, current: string, next: string, confirm = next) {
    fireEvent.change(dialog.getByLabelText('Kata sandi saat ini'), { target: { value: current } });
    fireEvent.change(dialog.getByLabelText('Kata sandi baru'), { target: { value: next } });
    fireEvent.change(dialog.getByLabelText('Ulangi kata sandi baru'), { target: { value: confirm } });
    fireEvent.click(dialog.getByRole('button', { name: 'Ganti kata sandi' }));
  }

  it('shows the sign-out warning and checks the four rules in the browser', async () => {
    const { calls } = serve();
    renderShell();
    const dialog = await openPasswordTab();
    expect(dialog.getByText('Anda akan keluar dari semua perangkat')).toBeInTheDocument();

    await fill(dialog, '', 'short');
    expect(await dialog.findByText('Isi kata sandi saat ini.')).toBeInTheDocument();
    expect(dialog.getByText('Kata sandi minimal 12 karakter.')).toBeInTheDocument();
    await waitFor(() => expect(dialog.getByLabelText('Kata sandi saat ini')).toHaveFocus());

    await fill(dialog, 'same-password-1', 'same-password-1');
    expect(await dialog.findByText('Kata sandi baru harus berbeda dari yang sekarang.')).toBeInTheDocument();

    await fill(dialog, 'old-password-1', 'new-password-12', 'new-password-13');
    expect(await dialog.findByText('Kata sandi belum sama.')).toBeInTheDocument();
    expect(writes(calls, '/auth/password')).toHaveLength(0);
  });

  it('shows a 401 under the current password and stays signed in', async () => {
    const { calls } = serve({ write: () => failure(401, 'UNAUTHORIZED') });
    renderShell();
    const dialog = await openPasswordTab();
    await fill(dialog, 'wrong-password', 'new-password-12');

    expect(await dialog.findByText('Kata sandi saat ini salah.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Kata sandi saat ini')).toHaveAttribute('aria-invalid', 'true');
    // The client refreshed once and asked again; the session itself was never lost.
    expect(writes(calls, '/auth/password')).toHaveLength(2);
    expect(screen.getByText('Daftar pengguna')).toBeInTheDocument();
    expect(writes(calls, '/auth/logout')).toHaveLength(0);
  });

  it('shows a 400 under the new password with the accept-page policy message', async () => {
    serve({ write: () => failure(400, 'BAD_REQUEST') });
    renderShell();
    const dialog = await openPasswordTab();
    await fill(dialog, 'old-password-1', 'password1234');
    expect(
      await dialog.findByText(
        'Kata sandi ini tidak bisa dipakai. Hindari kata sandi umum dan jangan memuat nama email atau username Anda.',
      ),
    ).toBeInTheDocument();
    expect(dialog.getByLabelText('Kata sandi baru')).toHaveAttribute('aria-invalid', 'true');
  });

  it('on success clears the local session without logout and lands on /login with the success alert', async () => {
    const { calls } = serve({ write: () => envelope({ message: 'Password changed successfully; all sessions were revoked' }) });
    renderShell();
    const dialog = await openPasswordTab();
    await fill(dialog, 'old-password-1', 'new-password-12');

    expect(await screen.findByText('Kata sandi diperbarui')).toBeInTheDocument();
    expect(screen.getByText('Silakan masuk dengan kata sandi baru Anda.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email atau username')).toHaveValue('dicky@digvation.id');
    expect(writes(calls, '/auth/logout')).toHaveLength(0);
    expect(sessionStorage.getItem('digvation-core.csrf.session')).toBeNull();
  });
});

describe('routes', () => {
  it('has no /profile page any more', async () => {
    serve();
    const router = createMemoryRouter(applicationRoutes, { initialEntries: ['/profile'] });
    render(providers(<RouterProvider router={router} />));
    expect(await screen.findByText('Halaman tidak ditemukan')).toBeInTheDocument();
  });
});
