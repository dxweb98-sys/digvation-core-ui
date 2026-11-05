import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { coreAccessAuditDataSource } from './core-access-audit-data-source';

vi.mock('../../../shared/config/application-config', () => ({
  applicationConfig: { dataSourceMode: 'core', coreApiUrl: 'http://core.test' },
}));

const fetchMock = vi.fn<typeof fetch>();

function respondWith(items: unknown[], total = items.length) {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({ success: true, data: { items, pagination: { page: 1, limit: 10, total, total_pages: 1 } } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );
}

function requestedUrl() {
  return new URL(String(fetchMock.mock.calls[0][0]));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('core access audit data source', () => {
  it('sends only page and limit when no filter is set', async () => {
    respondWith([]);

    await coreAccessAuditDataSource.list({ page: 2, limit: 25 });

    expect(requestedUrl().pathname).toBe('/authorization/audit-logs');
    expect(Object.fromEntries(requestedUrl().searchParams)).toEqual({ page: '2', limit: '25' });
  });

  it('sends each filter under the CORE query name', async () => {
    respondWith([]);

    await coreAccessAuditDataSource.list({
      page: 1,
      limit: 10,
      event: 'USER_ROLES_UPDATED',
      targetType: 'user',
      actorUserId: 'actor-1',
    });

    expect(Object.fromEntries(requestedUrl().searchParams)).toEqual({
      page: '1',
      limit: '10',
      event: 'USER_ROLES_UPDATED',
      target_type: 'user',
      actor_user_id: 'actor-1',
    });
  });

  it('maps a record and its metadata', async () => {
    respondWith(
      [
        {
          id: 'audit-1',
          actor_user_id: 'actor-1',
          event: 'USER_ROLES_UPDATED',
          target_type: 'user',
          target_id: 'user-1',
          metadata: { previous_role_slugs: ['MEMBER'], role_slugs: ['ADMIN'] },
          created_at: '2026-11-05T01:00:00.000Z',
        },
      ],
      41,
    );

    const page = await coreAccessAuditDataSource.list({ page: 1, limit: 10 });

    expect(page.total).toBe(41);
    expect(page.items[0]).toEqual({
      id: 'audit-1',
      actorUserId: 'actor-1',
      event: 'USER_ROLES_UPDATED',
      targetType: 'user',
      targetId: 'user-1',
      createdAt: '2026-11-05T01:00:00.000Z',
      roleSlug: undefined,
      roleSlugs: ['ADMIN'],
      previousRoleSlugs: ['MEMBER'],
      permissionSlugs: undefined,
      expiresAt: undefined,
    });
  });

  it('accepts a record with no actor, target or metadata', async () => {
    respondWith([
      {
        id: 'audit-2',
        actor_user_id: null,
        event: 'INVITATION_REVOKED',
        target_type: 'invitation',
        target_id: null,
        metadata: null,
        created_at: '2026-11-05T01:00:00.000Z',
      },
    ]);

    const { items } = await coreAccessAuditDataSource.list({ page: 1, limit: 10 });

    expect(items[0]).toMatchObject({ actorUserId: null, targetId: null, roleSlugs: undefined });
  });

  it('ignores metadata values of an unexpected type', async () => {
    respondWith([
      {
        id: 'audit-3',
        actor_user_id: 'actor-1',
        event: 'ROLE_CREATED',
        target_type: 'role',
        target_id: 'role-1',
        metadata: { role_slug: 7, permission_slugs: 'clients.read', expires_at: false },
        created_at: '2026-11-05T01:00:00.000Z',
      },
    ]);

    const { items } = await coreAccessAuditDataSource.list({ page: 1, limit: 10 });

    expect(items[0]).toMatchObject({ roleSlug: undefined, permissionSlugs: undefined, expiresAt: undefined });
  });
});
