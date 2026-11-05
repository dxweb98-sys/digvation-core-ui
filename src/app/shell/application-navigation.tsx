import {
  Activity,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Mail,
  Network,
  Package,
  Puzzle,
  Rocket,
  Server,
  Shield,
  TriangleAlert,
  User,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router';

interface NavigationItem {
  label: string;
  to: string;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const NAVIGATION_ICONS: Record<string, LucideIcon> = {
  '/': LayoutDashboard,
  '/clients': Building2,
  '/products': Package,
  '/capabilities': Puzzle,
  '/installations': Server,
  '/infrastructure': Network,
  '/deployments': Rocket,
  '/incidents': TriangleAlert,
  '/users': User,
  '/invitations': Mail,
  '/roles': Shield,
  '/audit': ClipboardList,
  '/platform-health': Activity,
};

function NavigationIcon({ to }: { to: string }) {
  const Icon = NAVIGATION_ICONS[to];
  return <Icon aria-hidden="true" className="navigation-item-icon" size={16} />;
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
      { label: 'Access audit', to: '/audit' },
    ],
  },
  { label: 'System', items: [{ label: 'Platform health', to: '/platform-health' }] },
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
