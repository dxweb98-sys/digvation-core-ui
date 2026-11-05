import { CoreApiStatus } from './core-api-status';
import { LogOut, Menu } from 'lucide-react';
import { AppAction } from '../../shared/ui/app-action';
import { DAvatar, DBadge } from '@digvation/ui';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useAuth } from '../../features/auth/use-auth';
import { applicationConfig } from '../../shared/config/application-config';
import { ApplicationNavigation } from './application-navigation';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Clients',
  '/clients/new': 'Add client',
  '/products': 'Products',
  '/capabilities': 'Capabilities',
  '/installations': 'Installations',
  '/infrastructure': 'Infrastructure',
  '/deployments': 'Deployments',
  '/incidents': 'Incidents',
  '/users': 'Users',
  '/invitations': 'Invitations',
  '/roles': 'Roles',
  '/audit': 'Access audit',
  '/platform-health': 'Platform health',
};

function OperatorProfile() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="operator-profile">
      <DAvatar name={user.fullname} size="sm" status="online" />
      <div className="operator-profile-details">
        <strong>{user.fullname}</strong>
        <span>{user.email}</span>
      </div>
      {applicationConfig.dataSourceMode === 'core' ? (
        <AppAction icon={LogOut} tone="tertiary" size="sm" onClick={() => void logout()}>
          Sign out
        </AppAction>
      ) : null}
    </div>
  );
}

export function ApplicationShell() {
  const location = useLocation();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const pageTitle =
    ROUTE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/clients/') ? 'Client' : 'Control Center');
  const coreMode = applicationConfig.dataSourceMode === 'core';

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
            <AppAction icon={Menu} tone="tertiary"
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
              <p className="header-title">{pageTitle}</p>
            </div>
          </div>
          <div className="header-status">
            <span>{coreMode ? 'Core API' : 'Development data'}</span>
            {coreMode ? <CoreApiStatus /> : <DBadge variant="warning">Mock data</DBadge>}
          </div>
        </header>
        <div
          className={`mobile-navigation${
            isMobileNavigationOpen ? ' mobile-navigation-open' : ''
          }`}
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
