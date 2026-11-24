import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput } from '../../../shared/ui/form-fields';
import { publicAuthApi } from '../../access/access-api';
import { BackIcon, SignInAlert, SignInLayout } from '../components/sign-in-layout';
import {
  clearResetChallenge,
  FORGOT_ERRORS,
  formatCountdown,
  getResetChallenge,
  requestResetCode,
  RESET_ROUTES,
  type ResetChallenge,
} from '../reset-challenge';
import { authAlertKey, useSignInCopy, type AlertKey } from '../sign-in-copy';
import type { LoginLocationState } from './login-page';

/** Re-renders every second so the countdown moves. */
function useTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
}

/** Step C: the code from the email and the new password. */
export function PasswordResetCodePage() {
  const challenge = getResetChallenge();
  // A reload forgets the in-memory challenge: start again from the email step.
  if (!challenge) return <Navigate to={RESET_ROUTES.email} replace />;
  return <CodeStep initial={challenge} />;
}

function CodeStep({ initial }: { initial: ResetChallenge }) {
  const navigate = useNavigate();
  const copy = useSignInCopy();
  useTick();
  const [challenge, setChallenge] = useState(initial);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [alert, setAlert] = useState<{ key: AlertKey; tone: 'bad' | 'info' } | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const { field, allowSubmit } = useFieldErrors<'otp' | 'password' | 'confirm'>('reset-form', () => ({
    ...(/^\d{6}$/.test(otp) ? {} : { otp: copy.codeEmpty }),
    ...(password.length < 12
      ? { password: copy.passwordShort }
      : password.length > 128
        ? { password: copy.passwordLong }
        : {}),
    ...(confirm === password ? {} : { confirm: copy.passwordMismatch }),
  }));

  async function resend() {
    if (resending) return;
    setResending(true);
    try {
      setChallenge(await requestResetCode(challenge.email));
      setOtp('');
      setAlert({ key: 'codeResent', tone: 'info' });
    } catch (cause) {
      setAlert({ key: authAlertKey(cause, FORGOT_ERRORS), tone: 'bad' });
    } finally {
      setResending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || !allowSubmit()) return;
    setLoading(true);
    setAlert(null);
    try {
      await publicAuthApi.resetPassword({
        challenge_id: challenge.challengeId,
        otp,
        new_password: password,
        confirm_password: confirm,
      });
      clearResetChallenge();
      navigate('/login', { replace: true, state: { passwordUpdatedFor: challenge.email } satisfies LoginLocationState });
    } catch (cause) {
      const key = authAlertKey(cause, { 400: 'codeInvalid', 429: 'tooMany' });
      setAlert({ key, tone: 'bad' });
      if (key === 'codeInvalid') {
        setOtp('');
        codeRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      setLoading(false);
    }
  }

  const remaining = challenge.expiresAt - Date.now();
  const [before, email, after] = copy.resetLead(challenge.email);

  return (
    <SignInLayout
      title={copy.resetTitle}
      lead={
        <>
          {before}
          <b>{email}</b>
          {after}
        </>
      }
      back={
        <Link className="signin-back" to={RESET_ROUTES.email} state={{ email: challenge.email }}>
          <BackIcon />
          {copy.changeEmail}
        </Link>
      }
    >
      <SignInAlert alert={alert} />
      <form className="signin-form" id="reset-form" noValidate onSubmit={submit}>
        <AppInput
          clearable={false}
          {...field('otp')}
          ref={codeRef}
          containerClassName="signin-code"
          label={copy.code}
          placeholder={copy.codePlaceholder}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
        />
        <p className="signin-hint">
          <span>{remaining > 0 ? copy.codeValid(formatCountdown(remaining)) : copy.codeExpired}</span>{' '}
          <button type="button" className="signin-link signin-link-sm" onClick={resend} disabled={resending}>
            {copy.resendCode}
          </button>
        </p>
        <AppInput
          clearable={false}
          {...field('password')}
          ref={passwordRef}
          label={copy.newPassword}
          hint={copy.newPasswordHint}
          placeholder={copy.newPasswordPlaceholder}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <AppInput
          clearable={false}
          {...field('confirm')}
          label={copy.repeatPassword}
          placeholder={copy.newPasswordPlaceholder}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />
        <AppAction className="signin-submit" type="submit" loading={loading}>
          {loading ? copy.savingPassword : copy.savePassword}
        </AppAction>
      </form>
    </SignInLayout>
  );
}
