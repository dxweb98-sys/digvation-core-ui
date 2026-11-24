import { DAlert } from '@digvation/ui';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { formatInstant } from '../../../shared/format/date';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput } from '../../../shared/ui/form-fields';
import { publicAuthApi } from '../../access/access-api';
import { invitationToken } from '../invitation-token';
import { passwordProblems } from '../password-problems';
import '../auth.css';

type Field = 'fullname' | 'username' | 'password' | 'confirm';

export function AcceptInvitationPage() {
  const location = useLocation();
  const token = invitationToken(location.hash, location.search);
  const verification = useQuery({
    queryKey: ['invitation-verify', token],
    queryFn: () => publicAuthApi.verifyInvitation(token!),
    enabled: Boolean(token),
    retry: false,
  });
  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { field, allowSubmit } = useFieldErrors<Field>('accept-form', () => ({
    ...(fullname.trim() ? {} : { fullname: 'Enter your full name.' }),
    ...(/^[a-z0-9._-]{3,50}$/.test(username.trim().toLowerCase())
      ? {}
      : { username: 'Use 3 to 50 letters, digits, ".", "_" or "-".' }),
    ...passwordProblems(password, confirm),
  }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || loading || !allowSubmit()) return;
    setLoading(true);
    setError(null);
    try {
      await publicAuthApi.acceptInvitation({
        token,
        fullname: fullname.trim(),
        username: username.trim().toLowerCase(),
        phone_number: phone.trim() || undefined,
        password,
        confirm_password: confirm,
      });
      setDone(true);
    } catch (cause) {
      setError(friendlyErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  let body;
  if (!token || verification.isError) {
    body = (
      <DAlert variant="danger">
        {verification.isError ? friendlyErrorMessage(verification.error) : 'This link has no invitation token.'} Ask
        the person who invited you for a new invitation.
      </DAlert>
    );
  } else if (verification.isPending) {
    body = <p className="auth-copy" role="status">Memeriksa undangan Anda…</p>;
  } else if (done) {
    body = <DAlert variant="success">Akun Anda sudah siap. Masuk untuk melanjutkan.</DAlert>;
  } else {
    body = (
      <form className="auth-form" id="accept-form" noValidate onSubmit={submit}>
        <p className="auth-copy">
          Invitation for <strong>{verification.data.email}</strong>, valid until {formatInstant(verification.data.expires_at)}.
        </p>
        <AppInput {...field('fullname')} label="Nama lengkap" autoComplete="name" value={fullname} onChange={setFullname} />
        <AppInput {...field('username')} label="Username" autoComplete="username" value={username} onChange={setUsername} />
        <AppInput label="Nomor telepon" optional autoComplete="tel" placeholder="+6281234567890" value={phone} onChange={setPhone} />
        <AppInput {...field('password')} label="Kata sandi" type="password" autoComplete="new-password" hint="Minimal 12 karakter." value={password} onChange={setPassword} />
        <AppInput {...field('confirm')} label="Konfirmasi kata sandi" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <AppAction type="submit" loading={loading}>
          Buat akun
        </AppAction>
      </form>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="accept-title">
        <div>
          <p className="auth-eyebrow">Digvation Control Center</p>
          <h1 id="accept-title">Terima undangan</h1>
        </div>
        {body}
        <Link className="auth-link" to="/login">
          Ke halaman masuk
        </Link>
      </section>
    </main>
  );
}
