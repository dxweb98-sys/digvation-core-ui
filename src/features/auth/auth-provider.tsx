import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { applicationConfig } from '../../shared/config/application-config';
import { CORE_AUTH_LOST_EVENT } from '../../shared/http/core-api-client';
import { AuthContext } from './auth-context';
import { coreAuthDataSource } from './data/core-auth-data-source';
import type { AuthStatus, AuthUser, LoginInput } from './types/auth';

const MOCK_USER: AuthUser = {
  id: 'mock-operator',
  fullname: 'Digvation Operator',
  phoneNumber: null,
  email: 'operator@digvation.local',
  username: 'operator',
  isActive: true,
  emailVerifiedAt: null,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

export function AuthProvider({ children }: PropsWithChildren) {
  const isMock = applicationConfig.dataSourceMode === 'mock';
  const [status, setStatus] = useState<AuthStatus>(
    isMock ? 'authenticated' : 'loading',
  );
  const [user, setUser] = useState<AuthUser | null>(isMock ? MOCK_USER : null);

  useEffect(() => {
    if (isMock) return;
    let active = true;
    void coreAuthDataSource
      .restore()
      .then((restoredUser) => {
        if (!active) return;
        setUser(restoredUser);
        setStatus(restoredUser ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, [isMock]);

  useEffect(() => {
    if (isMock || typeof window === 'undefined') return;
    const onAuthLost = () => {
      setUser(null);
      setStatus('anonymous');
    };
    window.addEventListener(CORE_AUTH_LOST_EVENT, onAuthLost);
    return () => window.removeEventListener(CORE_AUTH_LOST_EVENT, onAuthLost);
  }, [isMock]);

  const login = useCallback(
    async (input: LoginInput) => {
      if (isMock) return;
      const authenticatedUser = await coreAuthDataSource.login(input);
      setUser(authenticatedUser);
      setStatus('authenticated');
    },
    [isMock],
  );

  const logout = useCallback(async () => {
    if (isMock) return;
    try {
      await coreAuthDataSource.logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, [isMock]);

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
