import type { AccessPermission } from '../types/access';
import { permissionGroups } from '../presentation/access-presentation';

export function PermissionSummary({ permissions }: { permissions: readonly AccessPermission[] }) {
  const groups = permissionGroups(permissions);
  if (!groups.length) return <p className="access-secondary">No permissions assigned.</p>;
  return <div className="access-permission-groups">{groups.map(group => <section className="access-permission-domain" aria-label={group.label} key={group.domain}>
    <h4>{group.label}</h4>
    <ul className="access-capability-list">{group.permissions.map(permission => <li key={permission.id}><span aria-hidden="true" className="access-checkmark">✓</span>{permission.label}</li>)}</ul>
  </section>)}</div>;
}
