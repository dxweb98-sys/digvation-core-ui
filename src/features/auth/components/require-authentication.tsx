import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router';
import { applicationConfig } from '../../../shared/config/application-config';
import { useAuth } from '../use-auth';

export function RequireAuthentication({ children }: PropsWithChildren) {
  const location = useLocation();
  const { status } = useAuth();

  if (applicationConfig.dataSourceMode === 'mock') return children;
  if (status === 'loading') {
    return (
      <div className="auth-page">
        <div className="auth-status-card">Checking your Core session…</div>
      </div>
    );
  }
  if (status !== 'authenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return children;
}
