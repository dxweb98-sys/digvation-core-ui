import { NavLink } from 'react-router';

const FUTURE_NAVIGATION_ITEMS = [
  'Clients',
  'Products',
  'Installations',
  'Infrastructure',
  'Incidents',
] as const;

export function ApplicationNavigation() {
  return (
    <nav className="application-navigation" aria-label="Primary navigation">
      <p className="navigation-section-label">Workspace</p>
      <NavLink
        className={({ isActive }) =>
          `navigation-item${isActive ? ' navigation-item-active' : ''}`
        }
        to="/"
        end
      >
        <span className="navigation-item-mark" aria-hidden="true" />
        Overview
      </NavLink>

      <p className="navigation-section-label navigation-section-spaced">
        Control plane
      </p>
      {FUTURE_NAVIGATION_ITEMS.map((item) => (
        <span className="navigation-item navigation-item-disabled" key={item}>
          <span className="navigation-item-mark" aria-hidden="true" />
          {item}
          <span className="navigation-item-note">Soon</span>
        </span>
      ))}
    </nav>
  );
}
