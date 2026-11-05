import { NotConnectedError } from '../../../shared/data/data-availability';
import { coreApiRequest } from '../../../shared/http/core-api-client';
import type {
  AccessInvitation,
  AccessRole,
  AccessUser,
  InvitationStatus,
  RoleInput,
} from '../types/access';
import type { AccessDataSource } from './access-data-source';

interface CoreUser {
  id: string;
  fullname: string;
  email: string;
  is_active: boolean;
  roles: string[];
  created_at: string;
  updated_at: string;
}

interface CoreRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  updated_at: string;
}

interface CoreInvitation {
  id: string;
  email: string;
  roles: string[];
  invited_by: { fullname: string };
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  created_at: string;
}

interface CoreInvitationPage {
  items: CoreInvitation[];
  pagination: { total_pages: number };
}

const INVITATION_PAGE_SIZE = 100;

function toRole(role: CoreRole): AccessRole {
  return {
    id: role.id,
    slug: role.slug,
    name: role.name,
    description: role.description ?? '',
    permissions: role.permissions,
    updatedAt: role.updated_at,
  };
}

function roleIdFor(slug: string, roles: readonly AccessRole[]) {
  return roles.find((role) => role.slug === slug)?.id ?? slug;
}

function toUser(user: CoreUser, roles: readonly AccessRole[]): AccessUser {
  return {
    id: user.id,
    name: user.fullname,
    email: user.email,
    status: user.is_active ? 'ACTIVE' : 'INACTIVE',
    roleIds: user.roles.map((slug) => roleIdFor(slug, roles)),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function toInvitation(invitation: CoreInvitation, roles: readonly AccessRole[]): AccessInvitation {
  const roleIds = invitation.roles.map((slug) => roleIdFor(slug, roles));
  return {
    id: invitation.id,
    email: invitation.email,
    roleId: roleIds[0] ?? '',
    roleIds,
    status: invitation.status.toUpperCase() as InvitationStatus,
    invitedBy: invitation.invited_by.fullname,
    createdAt: invitation.created_at,
    expiresAt: invitation.expires_at,
  };
}

/** CORE requires a slug on create. The form asks only for a name, so it derives one. */
export function roleSlugFromName(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function fetchRoles() {
  const response = await coreApiRequest<{ items: CoreRole[] }>('/roles');
  return response.items.map(toRole);
}

async function fetchRole(id: string) {
  return toRole(await coreApiRequest<CoreRole>(`/roles/${encodeURIComponent(id)}`));
}

async function fetchInvitation(id: string) {
  const [invitation, roles] = await Promise.all([
    coreApiRequest<CoreInvitation>(`/invitations/${encodeURIComponent(id)}`),
    fetchRoles(),
  ]);
  return toInvitation(invitation, roles);
}

function slugsFor(roleIds: readonly string[], roles: readonly AccessRole[]) {
  return roleIds.map((id) => roles.find((role) => role.id === id)?.slug ?? id);
}

export const coreAccessDataSource: AccessDataSource = {
  async getUsers() {
    const [response, roles] = await Promise.all([
      coreApiRequest<{ users: CoreUser[] }>('/users'),
      fetchRoles(),
    ]);
    return response.users.map((user) => toUser(user, roles));
  },

  getRoles: fetchRoles,

  async getPermissions() {
    const response = await coreApiRequest<{ items: Array<{ slug: string }> }>('/permissions');
    return response.items.map((permission) => permission.slug);
  },

  async getInvitations() {
    const roles = await fetchRoles();
    const invitations: CoreInvitation[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = await coreApiRequest<CoreInvitationPage>(
        `/invitations?page=${page}&limit=${INVITATION_PAGE_SIZE}`,
      );
      invitations.push(...response.items);
      totalPages = response.pagination.total_pages;
      page += 1;
    } while (page <= totalPages);
    return invitations.map((invitation) => toInvitation(invitation, roles));
  },

  getAudit() {
    return Promise.reject(new NotConnectedError('Audit'));
  },

  async updateUserRoles(id, roleIds) {
    const roles = await fetchRoles();
    await coreApiRequest(`/users/${encodeURIComponent(id)}/roles`, {
      method: 'PUT',
      body: { role_slugs: slugsFor(roleIds, roles) },
    });
    return toUser(await coreApiRequest<CoreUser>(`/users/${encodeURIComponent(id)}`), roles);
  },

  transitionUser() {
    return Promise.reject(new NotConnectedError('User status'));
  },

  async createInvitation({ email, roleId }) {
    const roles = await fetchRoles();
    const created = await coreApiRequest<{ invitation_id: string }>('/invitations', {
      method: 'POST',
      body: { email, role_slugs: slugsFor([roleId], roles) },
    });
    return fetchInvitation(created.invitation_id);
  },

  async revokeInvitation(id) {
    await coreApiRequest(`/invitations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return fetchInvitation(id);
  },

  async createRole(input: RoleInput) {
    const created = await coreApiRequest<{ role_id: string }>('/roles', {
      method: 'POST',
      body: {
        name: input.name.trim(),
        slug: roleSlugFromName(input.name),
        description: input.description.trim() || undefined,
        permission_slugs: input.permissions,
      },
    });
    return fetchRole(created.role_id);
  },

  async updateRole(id, input) {
    const path = `/roles/${encodeURIComponent(id)}`;
    await coreApiRequest(path, {
      method: 'PATCH',
      body: { name: input.name.trim(), description: input.description.trim() },
    });
    await coreApiRequest(`${path}/permissions`, {
      method: 'PUT',
      body: { permission_slugs: input.permissions },
    });
    return fetchRole(id);
  },
};
