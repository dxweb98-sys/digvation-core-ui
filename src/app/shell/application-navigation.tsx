import { NavLink } from 'react-router';
import { usePermissions } from '../../features/auth/use-permissions';
import { NAVIGATION_GROUPS, visibleNavigation } from './navigation-items';
import { useShellCopy } from './shell-copy';

export function ApplicationNavigation({
  counts = {},
  onNavigate,
}: {
  counts?: Partial<Record<string, number>>;
  onNavigate?: () => void;
}) {
  const { canAny } = usePermissions();
  const copy = useShellCopy();
  const groups = visibleNavigation(NAVIGATION_GROUPS, canAny);

  return (
    <nav className="application-navigation" aria-label={copy.primaryNavigation}>
      {groups.map((group) => (
        <div className="navigation-group" key={group.label}>
          <p className="navigation-section-label">{copy.groups[group.label] ?? group.label}</p>
          {group.items.map(({ icon: Icon, ...item }) => {
            const label = copy.items[item.to] ?? item.label;
            const count = counts[item.to] ?? 0;
            return (
              <NavLink
                className={({ isActive }) => `navigation-item${isActive ? ' navigation-item-active' : ''}`}
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={label}
                onClick={onNavigate}
              >
                <Icon aria-hidden="true" className="navigation-item-icon" size={16} />
                <span className="navigation-item-label">{label}</span>
                {count > 0 ? <span className="navigation-item-count">{count}</span> : null}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
