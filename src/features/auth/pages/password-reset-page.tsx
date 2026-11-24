import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput } from '../../../shared/ui/form-fields';
import { BackIcon, SignInAlert, SignInLayout } from '../components/sign-in-layout';
import { EMAIL_PATTERN, FORGOT_ERRORS, RESET_ROUTES, getResetChallenge, requestResetCode } from '../reset-challenge';
import { authAlertKey, useSignInCopy, type AlertKey } from '../sign-in-copy';

/** Step B: the account email. */
export function PasswordResetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const copy = useSignInCopy();
  const prefill = (location.state as { email?: string } | null)?.email ?? getResetChallenge()?.email ?? '';
  const [email, setEmail] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertKey | null>(null);
  const { field, allowSubmit } = useFieldErrors<'email'>('forgot-form', () => {
    if (!email.trim()) return { email: copy.emailEmpty };
    return EMAIL_PATTERN.test(email.trim()) ? {} : { email: copy.emailInvalid };
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || !allowSubmit()) return;
    setLoading(true);
    setAlert(null);
    try {
      await requestResetCode(email);
      navigate(RESET_ROUTES.code);
    } catch (cause) {
      setAlert(authAlertKey(cause, FORGOT_ERRORS));
      setLoading(false);
    }
  }

  return (
    <SignInLayout
      title={copy.forgotTitle}
      lead={copy.forgotLead}
      back={
        <Link className="signin-back" to="/login">
          <BackIcon />
          {copy.backToSignIn}
        </Link>
      }
    >
      <SignInAlert alert={alert ? { key: alert, tone: 'bad' } : null} />
      <form className="signin-form" id="forgot-form" noValidate onSubmit={submit}>
        <AppInput
          clearable={false}
          {...field('email')}
          label={copy.email}
          type="email"
          autoComplete="email"
          placeholder={copy.identifierPlaceholder}
          value={email}
          onChange={setEmail}
        />
        <AppAction className="signin-submit" type="submit" loading={loading}>
          {loading ? copy.sendingCode : copy.sendCode}
        </AppAction>
      </form>
    </SignInLayout>
  );
}
