import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isForbiddenError } from '../../../shared/http/core-api-client';
import { coreAccessAuditDataSource } from '../data/core-access-audit-data-source';
import { accessDataSource } from '../data/resolve-access-data-source';
import type { AccessAuditQuery, AccessUserStatus, RoleInput } from '../types/access';

const ACCESS_QUERY_KEY = ['access'];
const refreshAccess = (queryClient: ReturnType<typeof useQueryClient>) => queryClient.invalidateQueries({ queryKey: ACCESS_QUERY_KEY });

export const useAccessUsers = () => useQuery({ queryKey: [...ACCESS_QUERY_KEY, 'users'], queryFn: () => accessDataSource.getUsers() });
export const useAccessRoles = () => useQuery({ queryKey: [...ACCESS_QUERY_KEY, 'roles'], queryFn: () => accessDataSource.getRoles() });
export const useAccessPermissions = () => useQuery({ queryKey: [...ACCESS_QUERY_KEY, 'permissions'], queryFn: () => accessDataSource.getPermissions() });
export const useAccessInvitations = () => useQuery({ queryKey: [...ACCESS_QUERY_KEY, 'invitations'], queryFn: () => accessDataSource.getInvitations() });
export const useAccessAudit = () => useQuery({ queryKey: [...ACCESS_QUERY_KEY, 'audit'], queryFn: () => accessDataSource.getAudit() });
export const useAccessAuditRecords = (query: AccessAuditQuery) => useQuery({
  queryKey: [...ACCESS_QUERY_KEY, 'audit-records', query],
  queryFn: () => coreAccessAuditDataSource.list(query),
  placeholderData: keepPreviousData,
  retry: (failures, error) => !isForbiddenError(error) && failures < 1,
});

export function useUpdateUserRoles(id: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (roleIds: string[]) => accessDataSource.updateUserRoles(id, roleIds), onSuccess: () => refreshAccess(queryClient) });
}
export function useUserStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (status: AccessUserStatus) => accessDataSource.transitionUser(id, status), onSuccess: () => refreshAccess(queryClient) });
}
export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: accessDataSource.createInvitation, onSuccess: () => refreshAccess(queryClient) });
}
export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: accessDataSource.revokeInvitation, onSuccess: () => refreshAccess(queryClient) });
}
export function useSaveRole(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: RoleInput) => id ? accessDataSource.updateRole(id, input) : accessDataSource.createRole(input), onSuccess: () => refreshAccess(queryClient) });
}
