import { DAlert, DBadge, DSpinner } from '@digvation/ui';
import { Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { isApiError } from '../../../shared/api/api-error';
import { formatInstant } from '../../../shared/format/date';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput } from '../../../shared/ui/form-fields';
import { publicAuthApi } from '../../access/access-api';
import { timeLeft } from '../../access/invitation-rules';
import { useInvitationsCopy } from '../../access/invitations-copy';
import { SignInAlert, SignInLayout } from '../components/sign-in-layout';
import { invitationToken } from '../invitation-token';

type Field = 'fullname' | 'username' | 'phone' | 'password' | 'confirm';
const USERNAME = /^[a-z0-9._-]{3,50}$/;
/** CORE's field names in a validation refusal, to this form's fields. */
const SERVER_FIELDS: Record<string, Field> = {
  fullname: 'fullname',
  username: 'username',
  phone_number: 'phone',
  password: 'password',
  confirm_password: 'confirm',
};

/** Accept invitation (docs/design/05-invitations.html, section E), public. */
export function AcceptInvitationPage() {
  const listCopy = useInvitationsCopy();
  const copy = listCopy.accept;
  const location = useLocation();
  const navigate = useNavigate();
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
  const [server, setServer] = useState<Partial<Record<Field, string>>>({});
  const [alert, setAlert] = useState<'tooMany' | 'unreachable' | null>(null);
  const [unusable, setUnusable] = useState(false);
  const [done, setDone] = useState(false);
  const refs = {
    username: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };

  const { field, allowSubmit } = useFieldErrors<Field>('accept-form', () => {
    const name = fullname.trim();
    const problems: Partial<Record<Field, string>> = {};
    if (!name) problems.fullname = copy.fullnameEmpty;
    else if (name.length > 150) problems.fullname = copy.fullnameLong;
    if (!USERNAME.test(username.trim().toLowerCase())) problems.username = copy.usernameInvalid;
    if (phone.length > 30) problems.phone = copy.phoneLong;
    if (password.length < 12) problems.password = copy.passwordShort;
    else if (password.length > 128) problems.password = copy.passwordLong;
    if (confirm !== password) problems.confirm = copy.passwordMismatch;
    return problems;
  });

  /** A field's message: the client rule first, then what CORE refused for that value. */
  const fieldProps = (name: Field) => {
    const own = field(name);
    return { ...own, error: own.error ?? server[name] };
  };
  const clearServer = (name: Field) => setServer((current) => ({ ...current, [name]: undefined }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || loading) return;
    setServer({});
    setAlert(null);
    if (!allowSubmit()) return;
    setLoading(true);
    try {
      await publicAuthApi.acceptInvitation({
        token,
        fullname: fullname.trim(),
        username: username.trim().toLowerCase(),
        // Sent as typed: CORE does not normalise phone numbers.
        phone_number: phone.trim() ? phone : undefined,
        password,
        confirm_password: confirm,
      });
      setDone(true);
    } catch (cause) {
      if (isApiError(cause, 'INVITATION_INVALID')) setUnusable(true);
      else if (isApiError(cause, 'USER_IDENTITY_CONFLICT')) {
        setServer({ username: copy.usernameTaken });
        requestAnimationFrame(() => refs.username.current?.focus());
      } else if (isApiError(cause) && cause.status === 429) setAlert('tooMany');
      else if (isApiError(cause) && cause.status === 400) {
        const mapped: Partial<Record<Field, string>> = {};
        for (const detail of cause.details) {
          const name = detail.field ? SERVER_FIELDS[detail.field] : undefined;
          if (name && !mapped[name]) mapped[name] = name === 'confirm' ? copy.passwordMismatch : detail.message;
        }
        // A refusal without field details is CORE's password policy (PasswordService.assertPolicy).
        if (!Object.keys(mapped).length) mapped.password = copy.passwordPolicy;
        setServer(mapped);
        if (mapped.password) requestAnimationFrame(() => refs.password.current?.focus());
      } else setAlert('unreachable');
    } finally {
      setLoading(false);
    }
  }

  const verifyTooMany = isApiError(verification.error) && verification.error.status === 429;

  if (done) {
    return (
      <SignInLayout title={copy.done[0]} lead={copy.done[1]}>
        <DAlert variant="info" title={copy.noRole[0]}>
          {copy.noRole[1]}
        </DAlert>
        <AppAction className="signin-submit" onClick={() => navigate('/login')}>
          {copy.signIn}
        </AppAction>
      </SignInLayout>
    );
  }

  if (verifyTooMany) {
    return (
      <SignInLayout title={copy.title} lead="">
        <SignInAlert alert={{ key: 'tooMany', tone: 'bad' }} />
      </SignInLayout>
    );
  }

  if (!token || verification.isError || unusable) {
    return (
      <SignInLayout title={copy.unusable[0]} lead={copy.unusable[1]}>
        <AppAction className="signin-submit" tone="secondary" onClick={() => navigate('/login')}>
          {copy.toSignIn}
        </AppAction>
      </SignInLayout>
    );
  }

  if (verification.isPending) {
    return (
      <SignInLayout title={copy.title} lead="">
        <p className="accept-checking" role="status">
          <DSpinner size="sm" /> {copy.checking}
        </p>
      </SignInLayout>
    );
  }

  const invitation = verification.data;

  return (
    <SignInLayout title={copy.title} lead={copy.lead}>
      <DAlert variant="info" icon={<Mail size={16} aria-hidden="true" />} className="accept-marker">
        <span className="accept-marker-label">{copy.invitationFor}</span>
        <b className="accept-marker-email">{invitation.email}</b>
        <span className="accept-marker-validity">
          <span>{copy.validUntil(formatInstant(invitation.expires_at))}</span>
          <DBadge variant="warning">{timeLeft(invitation.expires_at, listCopy)}</DBadge>
        </span>
      </DAlert>
      <SignInAlert alert={alert ? { key: alert, tone: 'bad' } : null} />
      <form className="signin-form" id="accept-form" noValidate onSubmit={submit}>
        <AppInput clearable={false} {...fieldProps('fullname')} label={copy.fullname} autoComplete="name" maxLength={150} value={fullname} onChange={(value) => { setFullname(value); clearServer('fullname'); }} />
        <AppInput clearable={false} {...fieldProps('username')} ref={refs.username} label={copy.username} hint={copy.usernameHint} autoComplete="username" autoCapitalize="none" value={username} onChange={(value) => { setUsername(value); clearServer('username'); }} />
        <AppInput clearable={false} {...fieldProps('phone')} label={copy.phone} hint={copy.phoneHint} autoComplete="tel" inputMode="tel" placeholder="+6281234567890" value={phone} onChange={(value) => { setPhone(value); clearServer('phone'); }} />
        <AppInput clearable={false} {...fieldProps('password')} ref={refs.password} label={copy.password} hint={copy.passwordHint} type="password" autoComplete="new-password" value={password} onChange={(value) => { setPassword(value); clearServer('password'); }} />
        <AppInput clearable={false} {...fieldProps('confirm')} label={copy.confirm} type="password" autoComplete="new-password" value={confirm} onChange={(value) => { setConfirm(value); clearServer('confirm'); }} />
        <AppAction className="signin-submit" type="submit" loading={loading}>
          {loading ? copy.submitting : copy.submit}
        </AppAction>
      </form>
    </SignInLayout>
  );
}
