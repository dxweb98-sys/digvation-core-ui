import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotConnectedError } from '../../../shared/data/data-availability';
import { coreAccessDataSource, roleSlugFromName } from './core-access-data-source';

const fetchMock = vi.fn<typeof fetch>();

const ROLE = {
  id: 'role-1',
  name: 'Support lead',
  slug: 'SUPPORT_LEAD',
  description: null,
  is_system: false,
  is_active: true,
  user_count: 1,
  permissions: ['clients.read'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};
const USER = {
  id: 'user-1',
  fullname: 'Rani Pratama',
  email: 'rani@example.test',
  is_active: false,
  roles: ['SUPPORT_LEAD'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};
const INVITATION = {
  id: 'invitation-1',
  email: 'dimas@example.test',
  roles: ['SUPPORT_LEAD', 'MEMBER'],
  invited_by: { id: 'user-1', fullname: 'Rani Pratama', email: 'rani@example.test' },
  status: 'pending',
  expires_at: '2026-02-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
};

function route(routes: Record<string, unknown>) {
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(String(input));
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    if (!(key in routes)) return Promise.reject(new Error(`Unexpected request: ${key}`));
    return Promise.resolve(
      new Response(JSON.stringify({ success: true, data: routes[key] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
}

function bodyOf(method: string, path: string) {
  const call = fetchMock.mock.calls.find(
    ([input, init]) => (init?.method ?? 'GET') === method && new URL(String(input)).pathname === path,
  );
  expect(call, `${method} ${path}`).toBeDefined();
  return JSON.parse(String(call?.[1]?.body));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('core access data source', () => {
  it('maps users, turning role slugs into role ids and is_active into a status', async () => {
    route({ 'GET /users': { users: [USER] }, 'GET /roles': { items: [ROLE] } });

    const [user] = await coreAccessDataSource.getUsers();

    expect(user).toMatchObject({
      id: 'user-1',
      name: 'Rani Pratama',
      status: 'INACTIVE',
      roleIds: ['role-1'],
    });
    expect(user.lastActivityAt).toBeUndefined();
  });

  it('maps a role with no description to an empty string', async () => {
    route({ 'GET /roles': { items: [ROLE] } });

    const [role] = await coreAccessDataSource.getRoles();

    expect(role).toMatchObject({ slug: 'SUPPORT_LEAD', description: '', updatedAt: ROLE.updated_at });
  });

  it('reads the permission catalog from CORE', async () => {
    route({ 'GET /permissions': { items: [{ id: 'p', slug: 'clients.read', name: 'Read' }] } });

    await expect(coreAccessDataSource.getPermissions()).resolves.toEqual(['clients.read']);
  });

  it('maps invitations and keeps every role', async () => {
    route({
      'GET /roles': { items: [ROLE] },
      'GET /invitations': { items: [INVITATION], pagination: { total_pages: 1 } },
    });

    const [invitation] = await coreAccessDataSource.getInvitations();

    expect(invitation).toMatchObject({
      status: 'PENDING',
      invitedBy: 'Rani Pratama',
      roleId: 'role-1',
      roleIds: ['role-1', 'MEMBER'],
    });
  });

  it('reads every page of invitations', async () => {
    fetchMock.mockImplementation((input) => {
      const url = new URL(String(input));
      const data =
        url.pathname === '/roles'
          ? { items: [ROLE] }
          : {
              items: [{ ...INVITATION, id: `invitation-${url.searchParams.get('page')}` }],
              pagination: { total_pages: 2 },
            };
      return Promise.resolve(new Response(JSON.stringify({ success: true, data }), { status: 200 }));
    });

    const invitations = await coreAccessDataSource.getInvitations();

    expect(invitations.map((invitation) => invitation.id)).toEqual(['invitation-1', 'invitation-2']);
  });

  it('saves user roles as slugs', async () => {
    route({
      'GET /roles': { items: [ROLE] },
      'PUT /users/user-1/roles': { message: 'ok', user_id: 'user-1', roles: ['SUPPORT_LEAD'] },
      'GET /users/user-1': USER,
    });

    await coreAccessDataSource.updateUserRoles('user-1', ['role-1']);

    expect(bodyOf('PUT', '/users/user-1/roles')).toEqual({ role_slugs: ['SUPPORT_LEAD'] });
  });

  it('creates a role with a slug derived from its name', async () => {
    route({ 'POST /roles': { message: 'ok', role_id: 'role-1' }, 'GET /roles/role-1': ROLE });

    await coreAccessDataSource.createRole({ name: 'Support lead', description: '', permissions: ['clients.read'] });

    expect(bodyOf('POST', '/roles')).toEqual({
      name: 'Support lead',
      slug: 'SUPPORT_LEAD',
      permission_slugs: ['clients.read'],
    });
  });

  it('updates role details and permissions through their two endpoints', async () => {
    route({
      'PATCH /roles/role-1': { message: 'ok', role_id: 'role-1' },
      'PUT /roles/role-1/permissions': { message: 'ok', role_id: 'role-1', permissions: [] },
      'GET /roles/role-1': ROLE,
    });

    await coreAccessDataSource.updateRole('role-1', { name: 'Lead', description: 'Team lead', permissions: ['roles.read'] });

    expect(bodyOf('PATCH', '/roles/role-1')).toEqual({ name: 'Lead', description: 'Team lead' });
    expect(bodyOf('PUT', '/roles/role-1/permissions')).toEqual({ permission_slugs: ['roles.read'] });
  });

  it('revokes with DELETE and returns the updated invitation', async () => {
    route({
      'DELETE /invitations/invitation-1': { message: 'ok' },
      'GET /invitations/invitation-1': { ...INVITATION, status: 'revoked' },
      'GET /roles': { items: [ROLE] },
    });

    await expect(coreAccessDataSource.revokeInvitation('invitation-1')).resolves.toMatchObject({ status: 'REVOKED' });
  });

  it('does not pretend to support what CORE lacks', async () => {
    await expect(coreAccessDataSource.getAudit()).rejects.toBeInstanceOf(NotConnectedError);
    await expect(coreAccessDataSource.transitionUser('user-1', 'INACTIVE')).rejects.toBeInstanceOf(NotConnectedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('derives a CORE-valid slug', () => {
    expect(roleSlugFromName('  Support lead / APAC! ')).toBe('SUPPORT_LEAD_APAC');
  });
});
