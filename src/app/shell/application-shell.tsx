import { DAvatar, DBadge, DButton } from '@digvation-labs/ui';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ApplicationNavigation } from './application-navigation';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Clients',
  '/products': 'Products',
  '/installations': 'Installations',
  '/infrastructure': 'Infrastructure',
  '/deployments': 'Deployments',
  '/incidents': 'Incidents',
  '/users': 'Users',
  '/invitations': 'Invitations',
  '/roles': 'Roles',
  '/audit': 'Audit',
  '/platform-health': 'Platform Health',
};

function OperatorProfile() {
  return (
    <div className="operator-profile">
      <DAvatar name="Digvation Operator" size="sm" status="online" />
      <div>
        <strong>Digvation Operator</strong>
        <span>Internal access</span>
      </div>
    </div>
  );
}

export function ApplicationShell() {
  const location = useLocation();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const pageTitle = ROUTE_TITLES[location.pathname] ?? 'Control Center';

  useEffect(() => {
    document.title = `${pageTitle} · Digvation Control Center`;
  }, [pageTitle]);

  return (
    <div className="application-layout">
      <aside className="application-sidebar">
        <div className="product-identity">
          <div className="product-mark" aria-hidden="true">D</div>
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
            <DButton
              className="mobile-navigation-trigger"
              variant="outline"
              size="sm"
              aria-controls="mobile-navigation"
              aria-expanded={isMobileNavigationOpen}
              onClick={() => setIsMobileNavigationOpen((isOpen) => !isOpen)}
            >
              Menu
            </DButton>
            <div>
              <p className="header-eyebrow">Control Center</p>
              <p className="header-title">{pageTitle}</p>
            </div>
          </div>
          <div className="header-status">
            <span>Development data</span>
            <DBadge variant="info" dot>Mock</DBadge>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
