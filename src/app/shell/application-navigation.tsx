import { NavLink } from 'react-router';

interface NavigationItem {
  label: string;
  to: string;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const NAVIGATION_ICONS: Record<string, string> = {
  '/': 'M2.5 2.5h4.5v5H2.5zM9 2.5h4.5v3H9zM2.5 9.5h4.5v4H2.5zM9 7.5h4.5v6H9z',
  '/clients': 'M2.5 13.5v-10h6v10M8.5 6.5h5v7M1.5 13.5h13M4.5 6h2M4.5 9h2',
  '/products': 'M8 1.8l5.5 3v6.4L8 14.2l-5.5-3V4.8zM2.5 4.8L8 8l5.5-3.2M8 8v6.2',
  '/capabilities': 'M8 2v3M8 11v3M2 8h3M11 8h3M5.5 5.5h5v5h-5z',
  '/installations': 'M2.5 3h11v4h-11zM2.5 9h11v4h-11zM5 5h.01M5 11h.01',
  '/infrastructure': 'M8 2v4M3.5 10V8h9v2M2 10h3v3.5H2zM6.5 10h3v3.5h-3zM11 10h3v3.5h-3z',
  '/deployments': 'M8 13.5v-9M4 8l4-4 4 4M3 2.5h10',
  '/incidents': 'M8 2l6.5 11.5h-13zM8 6.5v3.5M8 12h.01',
  '/users': 'M8 7.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3 13.5c.4-2.8 2.4-4 5-4s4.6 1.2 5 4',
  '/invitations': 'M2 4h12v8.5H2zM2 4.5l6 4.5 6-4.5',
  '/roles': 'M8 1.8l5 2v4c0 3-2 5.2-5 6.4-3-1.2-5-3.4-5-6.4v-4z',
  '/audit': 'M3.5 1.8h9v12.4h-9zM6 5h4M6 8h4M6 11h2.5',
  '/platform-health': 'M1.5 8.5h3l1.5-4 3 7.5 1.8-3.5h3.7',
};

function NavigationIcon({ to }: { to: string }) {
  return (
    <svg
      className="navigation-item-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={NAVIGATION_ICONS[to]} />
    </svg>
  );
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
        <NavigationIcon to="/" />
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
              <NavigationIcon to={item.to} />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
