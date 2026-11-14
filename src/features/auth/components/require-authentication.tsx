import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../use-auth';

export function RequireAuthentication({ children }: PropsWithChildren) {
  const location = useLocation();
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="auth-page">
        <div className="auth-status-card" role="status">
          Checking your Core session…
        </div>
      </div>
    );
  }
  if (status !== 'authenticated') {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }
  return children;
}
