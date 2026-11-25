import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { api } from '../../shared/api/client';
import { AuthContext } from './auth-context';
import {
  hasAnyPermission,
  hasPermission,
  type AuthorizationSnapshot,
  type Permission,
} from './permissions';

export const authorizationQueryKey = (userId: string | undefined) =>
  ['authorization', 'me', userId] as const;

/** The signed-in operator's permissions. Until CORE answers, nothing is offered. */
export function usePermissions() {
  const userId = useContext(AuthContext)?.user?.id;
  const snapshot = useQuery({
    queryKey: authorizationQueryKey(userId),
    queryFn: () => api.get<AuthorizationSnapshot>('/authorization/me'),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  return {
    resolved: !snapshot.isPending,
    /** Role slugs of the signed-in operator. */
    roles: snapshot.data?.roles ?? [],
    /** Permission codes of the signed-in operator; `*` for a Super Admin. */
    permissions: snapshot.data?.permissions ?? [],
    can: (permission: Permission) => hasPermission(snapshot.data, permission),
    canAny: (permissions: readonly Permission[]) => hasAnyPermission(snapshot.data, permissions),
  };
}
