import { ChevronsUpDown, Globe, LogOut, Menu, Monitor, Moon, Sun, User, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { usePendingInvitationCount, useRoles } from '../../features/access/access-queries';
import { PERMISSIONS } from '../../features/auth/permissions';
import { useSignInCopy } from '../../features/auth/sign-in-copy';
import { useAuth } from '../../features/auth/use-auth';
import { usePermissions } from '../../features/auth/use-permissions';
import { DISPLAY_LOCALES, setDisplayLocale, useDisplayLocale } from '../../shared/format/locale';
import { setAppearance, useAppearance, type Appearance } from '../../shared/theme/appearance';
import { AppMenu, AppMenuItem, AppMenuLabel, AppMenuSeparator } from '../../shared/ui/app-menu';
import { DigvationMark } from '../../shared/ui/digvation-mark';
import { PageBreadcrumb } from '../../shared/ui/page';
import { ApplicationNavigation } from './application-navigation';
import { trailFor } from './navigation-items';
import { useShellCopy } from './shell-copy';
import './application-shell.css';

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

const APPEARANCE_ICONS: Record<Appearance, typeof Moon> = { dark: Moon, light: Sun, system: Monitor };

function AccountMenu() {
  const { user, logout } = useAuth();
  const { can, roles } = usePermissions();
  const navigate = useNavigate();
  const copy = useShellCopy();
  const appearanceCopy = useSignInCopy();
  const locale = useDisplayLocale();
  const appearance = useAppearance();
  const roleCatalog = useRoles(can(PERMISSIONS.ROLES_READ));
  if (!user) return null;

  const roleNames = roles
    .map((slug) => roleCatalog.data?.find((role) => role.slug === slug)?.name ?? slug)
    .join(', ');
  const appearanceLabels: Record<Appearance, string> = {
    dark: appearanceCopy.appearanceDark,
    light: appearanceCopy.appearanceLight,
    system: appearanceCopy.appearanceSystem,
  };

  return (
    <AppMenu
      label={copy.accountMenu}
      placement="top-start"
      className="account-menu"
      trigger={({ open, ref }) => (
        <button
          ref={ref}
          type="button"
          className="account-button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`${copy.accountMenu}: ${user.fullname}`}
          title={user.fullname}
        >
          <span className="account-avatar" aria-hidden="true">
            {initials(user.fullname)}
          </span>
          <span className="account-who">
            <b>{user.fullname}</b>
            <span>{user.email}</span>
          </span>
          <ChevronsUpDown className="account-chevron" size={16} aria-hidden="true" />
        </button>
      )}
    >
      <div className="account-menu-header">
        <b>{user.fullname}</b>
        <span>{user.email}</span>
        {roleNames ? <span>{roleNames}</span> : null}
      </div>
      <AppMenuItem icon={<User size={16} aria-hidden="true" />} onSelect={() => navigate('/profile')}>
        {copy.myProfile}
      </AppMenuItem>
      <AppMenuLabel>{copy.language}</AppMenuLabel>
      {DISPLAY_LOCALES.map(({ value }) => (
        <AppMenuItem
          key={value}
          icon={<Globe size={16} aria-hidden="true" />}
          checked={locale === value}
          onSelect={() => setDisplayLocale(value)}
        >
          {copy.languages[value]}
        </AppMenuItem>
      ))}
      <AppMenuLabel>{copy.appearance}</AppMenuLabel>
      {(['dark', 'light', 'system'] as const).map((value) => {
        const Icon = APPEARANCE_ICONS[value];
        return (
          <AppMenuItem
            key={value}
            icon={<Icon size={16} aria-hidden="true" />}
            checked={appearance === value}
            onSelect={() => setAppearance(value)}
          >
            {appearanceLabels[value]}
          </AppMenuItem>
        );
      })}
      <AppMenuSeparator />
      <AppMenuItem danger icon={<LogOut size={16} aria-hidden="true" />} onSelect={() => void logout()}>
        {copy.logout}
      </AppMenuItem>
    </AppMenu>
  );
}

export function ApplicationShell() {
  const location = useLocation();
  const copy = useShellCopy();
  const { can } = usePermissions();
  const pendingInvitations = usePendingInvitationCount(can(PERMISSIONS.USERS_INVITE));
  const trail = trailFor(location.pathname, copy);
  const pageTitle = trail[trail.length - 1].label;
  // Formats are read at render; a new language re-renders the page.
  const locale = useDisplayLocale();
  // Below 780px the sidebar is a drawer; on wider screens this state has no effect.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    document.title = `${pageTitle} · Digvation Control Center`;
  }, [pageTitle]);

  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeDrawer, drawerOpen]);

  return (
    <div className="application-layout">
      <aside
        id="application-sidebar"
        className={`application-sidebar${drawerOpen ? ' application-sidebar-open' : ''}`}
      >
        <div className="product-identity">
          <DigvationMark className="product-mark" />
          <div className="product-text">
            <b>{copy.product}</b>
            <span>{copy.productContext}</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="drawer-close"
            aria-label={copy.closeMenu}
            onClick={closeDrawer}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <ApplicationNavigation counts={{ '/invitations': pendingInvitations }} onNavigate={closeDrawer} />
        <AccountMenu />
      </aside>
      {drawerOpen ? <div className="drawer-overlay" aria-hidden="true" onClick={closeDrawer} /> : null}

      <div className="application-workspace">
        <header className="application-header">
          <button
            ref={menuButtonRef}
            type="button"
            className="drawer-open"
            aria-label={copy.openMenu}
            aria-controls="application-sidebar"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="header-breadcrumb">
            <PageBreadcrumb trail={trail} />
          </div>
          <span className="header-title">{pageTitle}</span>
        </header>
        <main className="application-content">
          <div className="page-enter" key={`${location.pathname}:${locale}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
