import { DButton, DCheckbox, DInput } from '@digvation/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { applicationConfig } from '../../../shared/config/application-config';
import { useAuth } from '../use-auth';
import '../auth.css';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    if (status === 'authenticated') navigate(from, { replace: true });
  }, [from, navigate, status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identifier.trim() || !password || loading) return;
    setLoading(true);
    setError(null);
    try {
      await login({ identifier: identifier.trim(), password, rememberMe });
      navigate(from, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  if (applicationConfig.dataSourceMode === 'mock') {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand-mark" aria-hidden="true">
          D
        </div>
        <div>
          <p className="auth-eyebrow">Digvation Control Center</p>
          <h1 id="login-title">Sign in</h1>
          <p className="auth-copy">
            Use your Core control-plane account. Refresh sessions stay in the
            backend HttpOnly cookie.
          </p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <DInput
            label="Email or username"
            value={identifier}
            autoComplete="username"
            onChange={setIdentifier}
          />
          <DInput
            label="Password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={setPassword}
          />
          <label className="auth-remember">
            <DCheckbox
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Keep this browser session remembered</span>
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <DButton
            type="submit"
            loading={loading}
            disabled={!identifier.trim() || !password}
          >
            Sign in
          </DButton>
        </form>
      </section>
    </main>
  );
}
