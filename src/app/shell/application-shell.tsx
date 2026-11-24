import { LogOut, Menu } from 'lucide-react';
import { DAvatar } from '@digvation/ui';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../features/auth/use-auth';
import { AppAction } from '../../shared/ui/app-action';
import { ApplicationNavigation } from './application-navigation';
import { CoreApiStatus } from './core-api-status';
import { NAVIGATION_GROUPS } from './navigation-items';

function pageTitleFor(pathname: string) {
  const items = NAVIGATION_GROUPS.flatMap((group) => group.items);
  const match = items
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
  if (match) return match.label;
  if (pathname === '/profile') return 'Profil saya';
  return 'Control Center';
}

function OperatorProfile() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="operator-profile">
      <DAvatar name={user.fullname} size="sm" status="online" />
      <Link className="operator-profile-details" to="/profile">
        <strong>{user.fullname}</strong>
        <span>{user.email}</span>
      </Link>
      <AppAction icon={LogOut} tone="tertiary" size="sm" onClick={() => void logout()}>
        Keluar
      </AppAction>
    </div>
  );
}

export function ApplicationShell() {
  const location = useLocation();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const pageTitle = pageTitleFor(location.pathname);

  useEffect(() => {
    document.title = `${pageTitle} · Digvation Control Center`;
  }, [pageTitle]);

  return (
    <div className="application-layout">
      <aside className="application-sidebar">
        <div className="product-identity">
          <div className="product-mark" aria-hidden="true">
            D
          </div>
          <div>
            <p className="product-name">Digvation</p>
            <p className="product-context">Control Center</p>
          </div>
        </div>
        <ApplicationNavigation />
        <OperatorProfile />
      </aside>

      <div className="application-workspace">
        <header className="application-header">
          <div className="header-leading">
            <AppAction
              icon={Menu}
              tone="tertiary"
              className="mobile-navigation-trigger"
              size="sm"
              aria-controls="mobile-navigation"
              aria-expanded={isMobileNavigationOpen}
              onClick={() => setIsMobileNavigationOpen((isOpen) => !isOpen)}
            >
              Menu
            </AppAction>
            <div>
              <p className="header-eyebrow">Control Center</p>
            </div>
          </div>
          <div className="header-status">
            <span>Core API</span>
            <CoreApiStatus />
          </div>
        </header>
        <div
          className={`mobile-navigation${isMobileNavigationOpen ? ' mobile-navigation-open' : ''}`}
          id="mobile-navigation"
        >
          <ApplicationNavigation
            ariaLabel="Mobile navigation"
            onNavigate={() => setIsMobileNavigationOpen(false)}
          />
          <OperatorProfile />
        </div>
        <main className="application-content">
          <div className="page-enter" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
