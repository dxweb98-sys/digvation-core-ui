import { NavLink } from 'react-router';

interface NavigationItem {
  label: string;
  to: string;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const NAVIGATION_GROUPS: NavigationGroup[] = [
  { label: 'Customers', items: [{ label: 'Clients', to: '/clients' }] },
  {
    label: 'Products',
    items: [
      { label: 'Products', to: '/products' },
      { label: 'Capabilities', to: '/capabilities' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Installations', to: '/installations' },
      { label: 'Infrastructure', to: '/infrastructure' },
      { label: 'Deployments', to: '/deployments' },
      { label: 'Incidents', to: '/incidents' },
    ],
  },
  {
    label: 'Access',
    items: [
      { label: 'Users', to: '/users' },
      { label: 'Invitations', to: '/invitations' },
      { label: 'Roles', to: '/roles' },
      { label: 'Audit', to: '/audit' },
    ],
  },
  { label: 'System', items: [{ label: 'Platform Health', to: '/platform-health' }] },
] as const;

export function ApplicationNavigation({
  ariaLabel = 'Primary navigation',
  onNavigate,
}: {
  ariaLabel?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="application-navigation" aria-label={ariaLabel}>
      <NavLink
        className={({ isActive }) =>
          `navigation-item${isActive ? ' navigation-item-active' : ''}`
        }
        to="/"
        end
        onClick={onNavigate}
      >
        <span className="navigation-item-mark" aria-hidden="true" />
        Dashboard
      </NavLink>

      {NAVIGATION_GROUPS.map((group) => (
        <div className="navigation-group" key={group.label}>
          <p className="navigation-section-label">{group.label}</p>
          {group.items.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `navigation-item${isActive ? ' navigation-item-active' : ''}`
              }
              key={item.to}
              to={item.to}
              onClick={onNavigate}
            >
              <span className="navigation-item-mark" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
