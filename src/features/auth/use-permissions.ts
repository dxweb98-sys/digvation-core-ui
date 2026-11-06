import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { isCoreMode } from '../../shared/data/data-availability';
import { coreApiRequest } from '../../shared/http/core-api-client';
import { AuthContext } from './auth-context';

interface AuthorizationSnapshot {
  roles: string[];
  permissions: string[];
}

const SUPER_ADMIN = 'SUPER_ADMIN';

/**
 * What the signed-in operator may do, from GET /authorization/me. It only decides which controls
 * to offer: CORE still enforces every request. Until CORE answers, nothing is offered.
 */
export function usePermissions() {
  const userId = useContext(AuthContext)?.user?.id;
  const core = isCoreMode();
  const snapshot = useQuery({
    queryKey: ['authorization', 'me', userId],
    queryFn: () => coreApiRequest<AuthorizationSnapshot>('/authorization/me'),
    enabled: core,
  });
  return {
    resolved: !core || !snapshot.isPending,
    can(permission: string) {
      if (!core) return true;
      const data = snapshot.data;
      return Boolean(
        data?.roles.includes(SUPER_ADMIN) ||
          data?.permissions.includes(permission),
      );
    },
  };
}
