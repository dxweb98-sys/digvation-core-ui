import { DCheckbox } from '@digvation/ui';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput } from '../../../shared/ui/form-fields';
import { SignInAlert, SignInLayout } from '../components/sign-in-layout';
import { authAlertKey, useSignInCopy, type AlertKey } from '../sign-in-copy';
import { useAuth } from '../use-auth';

/** Router state the password-reset flow leaves behind. */
export interface LoginLocationState {
  from?: string;
  passwordUpdatedFor?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LoginLocationState | null) ?? {};
  const from = state.from ?? '/';
  const copy = useSignInCopy();
  const { status, login } = useAuth();
  const [identifier, setIdentifier] = useState(state.passwordUpdatedFor ?? '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ key: AlertKey; tone: 'bad' | 'good' } | null>(
    state.passwordUpdatedFor ? { key: 'passwordUpdated', tone: 'good' } : null,
  );
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'authenticated') navigate(from, { replace: true });
  }, [from, navigate, status]);

  const { field, allowSubmit } = useFieldErrors<'identifier' | 'password'>('login-form', () => ({
    ...(identifier.trim() ? {} : { identifier: copy.identifierEmpty }),
    ...(password ? {} : { password: copy.passwordEmpty }),
  }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !allowSubmit()) return;
    setLoading(true);
    setAlert(null);
    try {
      await login({ identifier: identifier.trim(), password, rememberMe });
      navigate(from, { replace: true });
    } catch (cause) {
      setAlert({ key: authAlertKey(cause, { 401: 'invalidLogin', 429: 'tooMany' }), tone: 'bad' });
      setPassword('');
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  const email = identifier.trim().includes('@') ? identifier.trim() : undefined;

  return (
    <SignInLayout title={copy.loginTitle} lead={copy.loginLead}>
      <SignInAlert alert={alert} />
      <form className="signin-form" id="login-form" noValidate onSubmit={submit}>
        <AppInput
          clearable={false}
          {...field('identifier')}
          label={copy.identifier}
          placeholder={copy.identifierPlaceholder}
          value={identifier}
          autoComplete="username"
          onChange={setIdentifier}
        />
        <AppInput
          clearable={false}
          {...field('password')}
          ref={passwordRef}
          label={copy.password}
          placeholder={copy.passwordPlaceholder}
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={setPassword}
        />
        <div className="signin-row">
          <label className="signin-remember">
            <DCheckbox checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            <span>{copy.rememberMe}</span>
          </label>
          <Link className="signin-link" to="/password-reset" state={{ email }}>
            {copy.forgotLink}
          </Link>
        </div>
        <AppAction className="signin-submit" type="submit" loading={loading}>
          {loading ? copy.signingIn : copy.signIn}
        </AppAction>
      </form>
      <p className="signin-foot">{copy.loginFoot}</p>
    </SignInLayout>
  );
}
