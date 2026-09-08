import type { AccessInvitation, AccessRole, AccessUser, AccessUserStatus, AuditEntry, RoleInput } from '../types/access';

export interface AccessDataSource {
  getUsers(): Promise<AccessUser[]>;
  getRoles(): Promise<AccessRole[]>;
  getInvitations(): Promise<AccessInvitation[]>;
  getAudit(): Promise<AuditEntry[]>;
  updateUserRoles(id: string, roleIds: string[]): Promise<AccessUser>;
  transitionUser(id: string, status: AccessUserStatus): Promise<AccessUser>;
  createInvitation(input: { email: string; roleId: string }): Promise<AccessInvitation>;
  revokeInvitation(id: string): Promise<AccessInvitation>;
  createRole(input: RoleInput): Promise<AccessRole>;
  updateRole(id: string, input: RoleInput): Promise<AccessRole>;
}
