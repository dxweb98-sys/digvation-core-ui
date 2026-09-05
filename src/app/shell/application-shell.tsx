import { DBadge } from '@digvation-labs/ui';
import { Outlet } from 'react-router';
import { ApplicationNavigation } from './application-navigation';

export function ApplicationShell() {
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
        <div className="sidebar-environment">
          <span>Data source</span>
          <DBadge variant="info" dot>Mock</DBadge>
        </div>
      </aside>

      <div className="application-workspace">
        <header className="application-header">
          <div>
            <p className="header-eyebrow">Internal operations</p>
            <p className="header-title">Control Center</p>
          </div>
          <DBadge variant="warning" dot>Foundation</DBadge>
        </header>
        <main className="application-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
