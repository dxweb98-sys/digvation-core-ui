import { DAlert } from '@digvation/ui';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput } from '../../../shared/ui/form-fields';
import { publicAuthApi } from '../../access/access-api';
import { passwordProblems } from '../password-problems';
import '../auth.css';

type Step = { kind: 'request' } | { kind: 'reset'; challengeId: string; email: string } | { kind: 'done' };

function RequestStep({ onSent }: { onSent: (challengeId: string, email: string) => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { field, allowSubmit } = useFieldErrors<'email'>('forgot-form', () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? {} : { email: 'Isi email akun Anda.' },
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || !allowSubmit()) return;
    setLoading(true);
    setError(null);
    try {
      const challenge = await publicAuthApi.forgotPassword({ email: email.trim().toLowerCase() });
      onSent(challenge.challenge_id, email.trim());
    } catch (cause) {
      setError(friendlyErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" id="forgot-form" noValidate onSubmit={submit}>
      <AppInput {...field('email')} label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <AppAction type="submit" loading={loading}>
        Kirim kode
      </AppAction>
    </form>
  );
}

function ResetStep({ challengeId, email, onDone }: { challengeId: string; email: string; onDone: () => void }) {
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { field, allowSubmit } = useFieldErrors<'otp' | 'password' | 'confirm'>('reset-form', () => ({
    ...(/^\d{6}$/.test(otp.trim()) ? {} : { otp: 'Isi kode enam digit dari email.' }),
    ...passwordProblems(password, confirm),
  }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || !allowSubmit()) return;
    setLoading(true);
    setError(null);
    try {
      await publicAuthApi.resetPassword({
        challenge_id: challengeId,
        otp: otp.trim(),
        new_password: password,
        confirm_password: confirm,
      });
      onDone();
    } catch (cause) {
      setError(friendlyErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" id="reset-form" noValidate onSubmit={submit}>
      <p className="auth-copy">Jika {email} punya akun, kode enam digit sedang dikirim.</p>
      <AppInput {...field('otp')} label="Kode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={setOtp} />
      <AppInput {...field('password')} label="Kata sandi baru" type="password" autoComplete="new-password" hint="Minimal 12 karakter." value={password} onChange={setPassword} />
      <AppInput {...field('confirm')} label="Konfirmasi kata sandi baru" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <AppAction type="submit" loading={loading}>
        Reset kata sandi
      </AppAction>
    </form>
  );
}

export function PasswordResetPage() {
  const [step, setStep] = useState<Step>({ kind: 'request' });

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-title">
        <div>
          <p className="auth-eyebrow">Digvation Control Center</p>
          <h1 id="reset-title">Reset kata sandi</h1>
        </div>
        {step.kind === 'request' ? (
          <RequestStep onSent={(challengeId, email) => setStep({ kind: 'reset', challengeId, email })} />
        ) : step.kind === 'reset' ? (
          <ResetStep challengeId={step.challengeId} email={step.email} onDone={() => setStep({ kind: 'done' })} />
        ) : (
          <DAlert variant="success">Kata sandi Anda sudah direset. Masuk dengan kata sandi baru.</DAlert>
        )}
        <Link className="auth-link" to="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
