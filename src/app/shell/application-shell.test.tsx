import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDisplayLocale, setDisplayLocale } from '../../shared/format/locale';
import { getAppearance, setAppearance } from '../../shared/theme/appearance';
import { envelope, failure, mockFetch } from '../../test/fetch-mock';
import { renderApp, TEST_USER } from '../../test/render-app';
import { ApplicationShell } from './application-shell';

const logout = vi.fn();
vi.mock('../../features/auth/use-auth', () => ({ useAuth: () => ({ user: TEST_USER, logout }) }));

function serve(permissions: string[], pending = 0) {
  mockFetch((call) => {
    const path = call.url.replace('http://localhost:4002', '').split('?')[0];
    if (path === '/authorization/me') return envelope({ roles: ['ADMIN'], permissions });
    if (path === '/roles') return envelope({ items: [{ slug: 'ADMIN', name: 'Admin', is_active: true }] });
    if (path === '/invitations') return envelope({ items: [], pagination: { page: 1, limit: 1, total: pending, total_pages: 1 } });
    return failure(404, 'NOT_FOUND');
  });
}

const navigation = () => within(screen.getByRole('navigation', { name: 'Navigasi utama' }));

async function openAccountMenu() {
  fireEvent.click(screen.getByRole('button', { name: /Menu akun/ }));
  return within(await screen.findByRole('menu'));
}

beforeEach(() => {
  logout.mockReset();
  setDisplayLocale('id-ID');
  setAppearance('dark');
});

afterEach(() => vi.unstubAllGlobals());

describe('application shell', () => {
  it('shows only the menu items the operator holds, with the pending invitation count', async () => {
    serve(['users.read', 'users.invite'], 3);
    renderApp(<ApplicationShell />, { path: '/*', route: '/users' });

    expect(await navigation().findByRole('link', { name: /Pengguna/ })).toBeInTheDocument();
    expect(navigation().getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/');
    expect(await navigation().findByText('3')).toBeInTheDocument();
    expect(navigation().queryByRole('link', { name: 'Role' })).not.toBeInTheDocument();
    expect(navigation().queryByRole('link', { name: 'Audit akses' })).not.toBeInTheDocument();
    expect(navigation().getByText('Akses')).toBeInTheDocument();
  });

  it('switches language and appearance from the account menu, with checkmarks', async () => {
    serve(['users.read', 'roles.read']);
    renderApp(<ApplicationShell />, { path: '/*', route: '/users' });

    let menu = await openAccountMenu();
    expect(await menu.findByText('Admin')).toBeInTheDocument();
    expect(menu.getByRole('menuitemradio', { name: 'Gelap' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(menu.getByRole('menuitemradio', { name: 'Terang hangat' }));
    expect(getAppearance()).toBe('light');

    menu = await openAccountMenu();
    fireEvent.click(menu.getByRole('menuitemradio', { name: 'English' }));
    expect(getDisplayLocale()).toBe('en-US');
    expect(await screen.findByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
  });

  it('logs out, and Esc closes the menu returning focus to its button', async () => {
    serve(['users.read']);
    renderApp(<ApplicationShell />, { path: '/*', route: '/users' });

    const button = screen.getByRole('button', { name: /Menu akun/ });
    let menu = await openAccountMenu();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(menu.getByRole('menuitem', { name: 'Profil saya' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(button).toHaveFocus();

    menu = await openAccountMenu();
    fireEvent.click(menu.getByRole('menuitem', { name: 'Keluar' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('opens the sidebar drawer and closes it by Esc, overlay, close button and menu choice', async () => {
    serve(['users.read']);
    const { container } = renderApp(<ApplicationShell />, { path: '/*', route: '/users' });
    // jsdom is 1024px wide, so the drawer controls are display:none: select them directly.
    const menuButton = container.querySelector('[aria-controls="application-sidebar"]') as HTMLButtonElement;
    const closeButton = container.querySelector('.drawer-close') as HTMLButtonElement;
    expect(menuButton).toHaveAttribute('aria-label', 'Buka menu');
    expect(closeButton).toHaveAttribute('aria-label', 'Tutup menu');
    const sidebar = container.querySelector('#application-sidebar') as HTMLElement;
    expect(menuButton).toHaveAttribute('aria-controls', 'application-sidebar');

    const open = async () => {
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      expect(sidebar).toHaveClass('application-sidebar-open');
      await waitFor(() => expect(closeButton).toHaveFocus());
    };
    const expectClosed = () => {
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar).not.toHaveClass('application-sidebar-open');
      expect(menuButton).toHaveFocus();
    };

    await open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expectClosed();

    await open();
    fireEvent.click(container.querySelector('.drawer-overlay') as HTMLElement);
    expectClosed();

    await open();
    fireEvent.click(closeButton);
    expectClosed();

    await open();
    fireEvent.click(await navigation().findByRole('link', { name: /Pengguna/ }));
    expectClosed();
  });
});
