import { coreApiRequest } from '../../../shared/http/core-api-client';
import type { AccessAuditPage, AccessAuditQuery, AccessAuditRecord } from '../types/access';

interface CoreAuditRecord {
  id: string;
  actor_user_id: string | null;
  event: string;
  target_type: string;
  target_id: string | null;
  metadata: unknown;
  created_at: string;
}

interface CoreAuditPage {
  items: CoreAuditRecord[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;
}

function toRecord(record: CoreAuditRecord): AccessAuditRecord {
  const metadata = (record.metadata ?? {}) as Record<string, unknown>;
  return {
    id: record.id,
    actorUserId: record.actor_user_id,
    event: record.event,
    targetType: record.target_type,
    targetId: record.target_id,
    createdAt: record.created_at,
    roleSlug: stringValue(metadata.role_slug),
    roleSlugs: stringList(metadata.role_slugs),
    previousRoleSlugs: stringList(metadata.previous_role_slugs),
    permissionSlugs: stringList(metadata.permission_slugs),
    expiresAt: stringValue(metadata.expires_at),
  };
}

/** GET /authorization/audit-logs. CORE records access and permission changes only. */
export const coreAccessAuditDataSource = {
  async list(query: AccessAuditQuery): Promise<AccessAuditPage> {
    const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
    if (query.event) params.set('event', query.event);
    if (query.targetType) params.set('target_type', query.targetType);
    if (query.actorUserId) params.set('actor_user_id', query.actorUserId);
    const response = await coreApiRequest<CoreAuditPage>(`/authorization/audit-logs?${params}`);
    return { items: response.items.map(toRecord), total: response.pagination.total };
  },
};
