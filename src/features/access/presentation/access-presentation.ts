import { PERMISSIONS, type AccessPermission, type AccessRole, type AuditEntry } from '../types/access';

const readableLabel = (value: string) => {
  const words = value.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};
const rank = (permission: string) => {
  const index = (PERMISSIONS as readonly string[]).indexOf(permission);
  return index === -1 ? PERMISSIONS.length : index;
};

export function permissionGroups(permissions: readonly AccessPermission[]) {
  const ordered = [...new Set(permissions)]
    .filter(permission => permission.includes('.'))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const domains = [...new Set(ordered.map(permission => permission.split('.')[0]))];
  return domains.map(domain => ({
    domain,
    label: readableLabel(domain),
    permissions: ordered.filter(permission => permission.startsWith(`${domain}.`)).map(permission => ({
      id: permission,
      label: readableLabel(permission.split('.').slice(1).join(' ')),
    })),
  }));
}

function parseValues(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
  } catch { /* Mock audit records also use comma-separated values. */ }
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

export function auditChanges(entry: AuditEntry, roles: readonly AccessRole[]) {
  const isRoleAssignment = entry.action === 'Role assignment changed';
  const isPermissionEvent = entry.action === 'Role permissions changed' || entry.action === 'Role created';
  if (!isRoleAssignment && !isPermissionEvent) return null;
  const labels = new Map<string, string>(isRoleAssignment
    ? roles.map(role => [role.id, role.name])
    : permissionGroups(PERMISSIONS).flatMap(group => group.permissions.map(permission => [permission.id, `${group.label} · ${permission.label}`] as [string, string])));
  const before = new Set(parseValues(entry.metadata?.before));
  const after = new Set(parseValues(entry.metadata?.after ?? entry.metadata?.permissions));
  const added = [...after].filter(value => !before.has(value) && labels.has(value)).map(value => labels.get(value)!);
  const removed = [...before].filter(value => !after.has(value) && labels.has(value)).map(value => labels.get(value)!);
  return { added, removed, isRoleAssignment };
}
