import { DCheckbox } from '@digvation/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { loginErrorMessage } from '../login-error';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput } from '../../../shared/ui/form-fields';
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
    ...(identifier.trim() ? {} : { identifier: 'Isi email atau username Anda.' }),
    ...(password ? {} : { password: 'Isi kata sandi Anda.' }),
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
      setError(loginErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand-mark" aria-hidden="true">
          D
        </div>
        <div>
          <p className="auth-eyebrow">Digvation Control Center</p>
          <h1 id="login-title">Masuk</h1>
          <p className="auth-copy">Gunakan akun operator Digvation Anda.</p>
        </div>
        <form className="auth-form" id="login-form" noValidate onSubmit={submit}>
          <AppInput
            {...field('identifier')}
            label="Email atau username"
            placeholder="operator@digvation.id"
            value={identifier}
            autoComplete="username"
            onChange={setIdentifier}
          />
          <AppInput
            {...field('password')}
            label="Kata sandi"
            placeholder="Kata sandi Anda"
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
            <span>Biarkan saya tetap masuk</span>
          </label>
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <AppAction type="submit" loading={loading}>
            Masuk
          </AppAction>
        </form>
        <Link className="auth-link" to="/password-reset">
          Lupa kata sandi?
        </Link>
      </section>
    </main>
  );
}
