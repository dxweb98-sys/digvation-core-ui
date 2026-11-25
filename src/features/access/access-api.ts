import { api, seg, type Query } from '../../shared/api/client';
import type { Dto } from '../../shared/api/types';

export type User = Dto<'UserWithRolesDto'>;
export type Role = Dto<'RoleDto'>;
export type PermissionItem = Dto<'PermissionDto'>;
export type Invitation = Dto<'InvitationDto'>;
export type AuditItem = Dto<'AuthorizationAuditItemDto'>;

export const accessApi = {
  users: (query: Query) => api.list<User>('/users', query),
  user: (userId: string) => api.get<User>(`/users/${seg(userId)}`),
  userRoles: (userId: string) => api.get<Dto<'UserRolesDto'>>(`/users/${seg(userId)}/roles`),
  setUserRoles: (userId: string, body: Dto<'SetUserRolesDto'>) =>
    api.put<Dto<'UserRolesUpdateResponseDto'>>(`/users/${seg(userId)}/roles`, body),
  setUserStatus: (userId: string, body: Dto<'ChangeUserStatusDto'>) =>
    api.patch<Dto<'UserStatusResponseDto'>>(`/users/${seg(userId)}/status`, body),

  roles: () => api.get<Dto<'RoleListDto'>>('/roles'),
  createRole: (body: Dto<'CreateRoleDto'>) => api.post<Dto<'RoleMutationResponseDto'>>('/roles', body),
  updateRole: (roleId: string, body: Dto<'UpdateRoleDto'>) =>
    api.patch<Dto<'RoleMutationResponseDto'>>(`/roles/${seg(roleId)}`, body),
  setRolePermissions: (roleId: string, body: Dto<'SetRolePermissionsDto'>) =>
    api.put<Dto<'RolePermissionsUpdateResponseDto'>>(`/roles/${seg(roleId)}/permissions`, body),
  deleteRole: (roleId: string) => api.delete<Dto<'RoleMutationResponseDto'>>(`/roles/${seg(roleId)}`),
  rolePermissions: (roleId: string) =>
    api.get<Dto<'RolePermissionsDto'>>(`/roles/${seg(roleId)}/permissions`),
  permissions: () => api.get<Dto<'PermissionListDto'>>('/permissions'),

  invitations: (query: Query) => api.list<Invitation>('/invitations', query),
  invite: (body: Dto<'CreateInvitationDto'>) => api.post<Dto<'InvitationCreatedDto'>>('/invitations', body),
  revokeInvitation: (invitationId: string) =>
    api.delete<Dto<'InvitationRevokedDto'>>(`/invitations/${seg(invitationId)}`),

  audit: (query: Query) => api.list<AuditItem>('/authorization/audit-logs', query),

  updateProfile: (body: Dto<'UpdateProfileDto'>) =>
    api.patch<Dto<'UpdateProfileResponseDto'>>('/users/me', body),
  changePassword: (body: Dto<'ChangePasswordDto'>) =>
    api.put<Dto<'MessageResponseDto'>>('/auth/password', body),
};

/** Public routes used before sign-in. */
export const publicAuthApi = {
  forgotPassword: (body: Dto<'ForgotPasswordDto'>) =>
    api.post<Dto<'ChallengeResponseDto'>>('/auth/password/forgot', body),
  resetPassword: (body: Dto<'ResetPasswordDto'>) =>
    api.post<Dto<'MessageResponseDto'>>('/auth/password/reset', body),
  verifyInvitation: (token: string) =>
    api.post<Dto<'InvitationVerificationDto'>>('/invitations/verify', { token }),
  acceptInvitation: (body: Dto<'AcceptInvitationDto'>) =>
    api.post<Dto<'InvitationAcceptedDto'>>('/invitations/accept', body),
};
