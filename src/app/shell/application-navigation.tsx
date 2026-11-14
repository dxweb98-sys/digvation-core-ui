import { NavLink } from 'react-router';
import { usePermissions } from '../../features/auth/use-permissions';
import { NAVIGATION_GROUPS, visibleNavigation } from './navigation-items';

export function ApplicationNavigation({
  ariaLabel = 'Primary navigation',
  onNavigate,
}: {
  ariaLabel?: string;
  onNavigate?: () => void;
}) {
  const { canAny } = usePermissions();
  const groups = visibleNavigation(NAVIGATION_GROUPS, canAny);

  return (
    <nav className="application-navigation" aria-label={ariaLabel}>
      {groups.map((group) => (
        <div className="navigation-group" key={group.label}>
          <p className="navigation-section-label">{group.label}</p>
          {group.items.map(({ icon: Icon, ...item }) => (
            <NavLink
              className={({ isActive }) =>
                `navigation-item${isActive ? ' navigation-item-active' : ''}`
              }
              key={item.to}
              to={item.to}
              onClick={onNavigate}
            >
              <Icon aria-hidden="true" className="navigation-item-icon" size={16} />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
