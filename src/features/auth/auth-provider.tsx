import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import {
  AUTH_LOST_EVENT,
  api,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
} from '../../shared/api/client';
import { clearCoreSessionTokens } from '../../shared/api/session';
import { AuthContext, type AuthStatus, type AuthUser, type LoginInput, type SignedOutNotice } from './auth-context';

const currentUser = () => api.get<AuthUser>('/users/me');

/**
 * The CORE session. The access token lives in memory only; on load the
 * HttpOnly refresh cookie (with its CSRF token) restores it.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [signedOutNotice, setSignedOutNotice] = useState<SignedOutNotice | null>(null);

  useEffect(() => {
    let active = true;
    void refreshSession()
      .then((session) => (session ? currentUser() : null))
      .then((restored) => {
        if (!active) return;
        setUser(restored);
        setStatus(restored ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onAuthLost = () => {
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
    };
    window.addEventListener(AUTH_LOST_EVENT, onAuthLost);
    return () => window.removeEventListener(AUTH_LOST_EVENT, onAuthLost);
  }, [queryClient]);

  const login = useCallback(async (input: LoginInput) => {
    await loginRequest({
      identifier: input.identifier,
      password: input.password,
      remember_me: input.rememberMe,
    });
    setUser(await currentUser());
    setSignedOutNotice(null);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
    }
  }, [queryClient]);

  const endSession = useCallback(
    (notice?: SignedOutNotice) => {
      clearCoreSessionTokens();
      setSignedOutNotice(notice ?? null);
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({ status, user, login, logout, setUser, endSession, signedOutNotice }),
    [status, user, login, logout, endSession, signedOutNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
