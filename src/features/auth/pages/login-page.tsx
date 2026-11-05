import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppInput } from '../../../shared/ui/form-fields';
import { AppAction } from '../../../shared/ui/app-action';
import { DCheckbox } from '@digvation/ui';
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

  const { field, allowSubmit } = useFieldErrors<'identifier' | 'password'>('login-form', () => ({
    ...(identifier.trim() ? {} : { identifier: 'Enter your email or username.' }),
    ...(password ? {} : { password: 'Enter your password.' }),
  }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !allowSubmit()) return;
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
            Use your Digvation operator account.
          </p>
        </div>
        <form className="auth-form" id="login-form" noValidate onSubmit={submit}>
          <AppInput
            {...field('identifier')}
            label="Email or username" placeholder="operator@digvation.id"
            value={identifier}
            autoComplete="username"
            onChange={setIdentifier}
          />
          <AppInput
            {...field('password')}
            label="Password" placeholder="Your password"
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
            <span>Keep me signed in</span>
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <AppAction
            type="submit"
            loading={loading}
          >
            Sign in
          </AppAction>
        </form>
      </section>
    </main>
  );
}
