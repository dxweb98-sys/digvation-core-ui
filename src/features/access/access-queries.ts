import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Query } from '../../shared/api/client';
import { accessApi } from './access-api';

export const accessKeys = {
  all: ['access'] as const,
  users: (query?: Query) => ['access', 'users', query ?? {}] as const,
  user: (userId: string) => ['access', 'user', userId] as const,
  userRoles: (userId: string) => ['access', 'user', userId, 'roles'] as const,
  roles: ['access', 'roles'] as const,
  rolePermissions: (roleId: string) => ['access', 'roles', roleId, 'permissions'] as const,
  permissions: ['access', 'permissions'] as const,
  invitations: (query?: Query) => ['access', 'invitations', query ?? {}] as const,
  audit: (query?: Query) => ['access', 'audit', query ?? {}] as const,
};

export function useUsers(query: Query, enabled = true) {
  return useQuery({
    queryKey: accessKeys.users(query),
    queryFn: () => accessApi.users(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: accessKeys.roles,
    queryFn: async () => (await accessApi.roles()).items,
    enabled,
  });
}

export function usePermissionCatalog(enabled = true) {
  return useQuery({
    queryKey: accessKeys.permissions,
    queryFn: async () => (await accessApi.permissions()).items,
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useInvitations(query: Query) {
  return useQuery({
    queryKey: accessKeys.invitations(query),
    queryFn: () => accessApi.invitations(query),
    placeholderData: keepPreviousData,
  });
}

export function useAudit(query: Query) {
  return useQuery({
    queryKey: accessKeys.audit(query),
    queryFn: () => accessApi.audit(query),
    placeholderData: keepPreviousData,
  });
}

/** Pending invitations for the menu badge and the users toolbar; 0 without users.invite. */
export function usePendingInvitationCount(enabled: boolean) {
  const query = { status: 'pending', limit: 1 };
  const result = useQuery({
    queryKey: accessKeys.invitations(query),
    queryFn: () => accessApi.invitations(query),
    enabled,
    staleTime: 30_000,
  });
  return enabled ? (result.data?.pagination.total ?? 0) : 0;
}

/** The roles a user holds now, read fresh when the change roles dialog opens. */
export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: accessKeys.userRoles(userId ?? ''),
    queryFn: async () => (await accessApi.userRoles(userId!)).roles,
    enabled: Boolean(userId),
    staleTime: 0,
  });
}

/** A role's permissions, read fresh when the permission editor opens. */
export function useRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: accessKeys.rolePermissions(roleId ?? ''),
    queryFn: async () => (await accessApi.rolePermissions(roleId!)).permissions,
    enabled: Boolean(roleId),
    staleTime: 0,
  });
}
