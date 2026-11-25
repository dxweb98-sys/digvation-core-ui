import { DAlert, DBadge, DDialog, DTabs, DTabsContent, DTabsList, DTabsTrigger } from '@digvation/ui';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isApiError } from '../../../shared/api/api-error';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput } from '../../../shared/ui/form-fields';
import type { AuthUser } from '../../auth/auth-context';
import { useAuth } from '../../auth/use-auth';
import { accessApi } from '../access-api';
import { useMyRoleNames } from '../access-queries';
import { useInvitationsCopy } from '../invitations-copy';
import { useProfileCopy } from '../profile-copy';
import './profile-dialog.css';

type Tab = 'profile' | 'password';
type ProfileField = 'fullname' | 'username' | 'phone';
type PasswordField = 'current' | 'next' | 'confirm';
/** What the footer needs from the open tab. */
interface TabState {
  canSubmit: boolean;
  pending: boolean;
}

const USERNAME = /^[a-z0-9._-]{3,50}$/;
const FORMS: Record<Tab, string> = { profile: 'profile-form', password: 'password-form' };
const IDLE: TabState = { canSubmit: false, pending: false };

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

/**
 * "Profil saya" (docs/design/06-profile.html): one dialog with a profile tab
 * (PATCH /users/me) and a password tab (PUT /auth/password). Below 640px
 * DDialog is the design-system drawer; the tabs and the footer stay visible.
 */
export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const copy = useProfileCopy();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [state, setState] = useState<TabState>(IDLE);
  // Every open starts on the profile tab with fresh forms.
  const [opening, setOpening] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab('profile');
      setState(IDLE);
      setOpening((value) => value + 1);
    }
  }

  if (!user) return null;
  const close = () => {
    if (!state.pending) onClose();
  };
  const submitLabel =
    tab === 'profile'
      ? state.pending ? copy.saving : copy.save
      : state.pending ? copy.changing : copy.change;

  return (
    <DDialog
      open={open}
      onClose={close}
      size="md"
      noPadding
      overlayClassName="app-dialog-overlay"
      className="profile-dialog"
      title={copy.title}
      footer={
        <div className="profile-dialog-actions">
          <AppAction tone="secondary" onClick={close} disabled={state.pending}>
            {copy.cancel}
          </AppAction>
          <AppAction type="submit" form={FORMS[tab]} disabled={!state.canSubmit} loading={state.pending}>
            {submitLabel}
          </AppAction>
        </div>
      }
    >
      <div className="profile-dialog-body">
        <ProfileHeader user={user} />
        <DTabs
          value={tab}
          defaultValue="profile"
          onValueChange={(value) => {
            if (state.pending) return;
            setState(IDLE);
            setTab(value as Tab);
          }}
        >
          <DTabsList className="profile-tabs-list">
            <DTabsTrigger value="profile">{copy.tabs.profile}</DTabsTrigger>
            <DTabsTrigger value="password">{copy.tabs.password}</DTabsTrigger>
          </DTabsList>
          {/* Only the open tab is mounted, so switching tabs drops the other tab's messages. */}
          <DTabsContent value="profile" className="profile-tab-panel">
            <ProfileTab key={opening} user={user} onState={setState} onDone={onClose} />
          </DTabsContent>
          <DTabsContent value="password" className="profile-tab-panel">
            <PasswordTab key={opening} user={user} onState={setState} />
          </DTabsContent>
        </DTabs>
      </div>
    </DDialog>
  );
}

function ProfileHeader({ user }: { user: AuthUser }) {
  const copy = useProfileCopy();
  const roles = useMyRoleNames();
  return (
    <>
      <div className="profile-who">
        <span className="profile-avatar" aria-hidden="true">
          {initials(user.fullname)}
        </span>
        <span className="profile-who-text">
          <b>{user.fullname}</b>
          <span className="profile-muted">{user.email}</span>
        </span>
      </div>
      <div className="profile-roles">
        <span className="profile-muted profile-small">{copy.roles}</span>
        {roles.length ? (
          roles.map((name) => (
            <DBadge key={name} variant="default">
              {name}
            </DBadge>
          ))
        ) : (
          <span className="profile-muted profile-small">{copy.noRole}</span>
        )}
      </div>
    </>
  );
}

function ErrorAlert({ error }: { error: [string, string] | null }) {
  if (!error) return null;
  return (
    <DAlert variant="danger" title={error[0]}>
      {error[1] || null}
    </DAlert>
  );
}

function ProfileTab({
  user,
  onState,
  onDone,
}: {
  user: AuthUser;
  onState: (state: TabState) => void;
  onDone: () => void;
}) {
  const copy = useProfileCopy();
  const { setUser } = useAuth();
  const [fullname, setFullname] = useState(user.fullname);
  const [username, setUsername] = useState(user.username);
  const [phone, setPhone] = useState(user.phone_number ?? '');
  const [server, setServer] = useState<Partial<Record<ProfileField, string>>>({});
  const [alert, setAlert] = useState<[string, string] | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  const save = useApiMutation(accessApi.updateProfile, {
    success: copy.saved,
    toastErrors: false,
    onSuccess: (result) => {
      setUser(result.user);
      onDone();
    },
  });

  const { field, allowSubmit } = useFieldErrors<ProfileField>(FORMS.profile, () => {
    const problems: Partial<Record<ProfileField, string>> = {};
    const name = fullname.trim();
    if (!name) problems.fullname = copy.fullnameEmpty;
    else if (name.length > 150) problems.fullname = copy.fullnameLong;
    if (!USERNAME.test(username.trim().toLowerCase())) problems.username = copy.usernameInvalid;
    if (phone.length > 30) problems.phone = copy.phoneLong;
    return problems;
  });
  const fieldProps = (name: ProfileField) => {
    const own = field(name);
    return { ...own, error: own.error ?? server[name] };
  };
  const edit = (name: ProfileField, set: (value: string) => void) => (value: string) => {
    set(value);
    setServer((current) => ({ ...current, [name]: undefined }));
  };

  // Only what changed is sent; an emptied phone goes as "" and CORE stores null.
  const changes: { fullname?: string; username?: string; phone_number?: string } = {};
  if (fullname.trim() !== user.fullname) changes.fullname = fullname.trim();
  if (username.trim().toLowerCase() !== user.username) changes.username = username.trim().toLowerCase();
  if (phone.trim() !== (user.phone_number ?? '')) changes.phone_number = phone.trim();
  const changed = Object.keys(changes).length > 0;

  useEffect(() => onState({ canSubmit: changed, pending: save.isPending }), [changed, onState, save.isPending]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!changed || save.isPending) return;
    setServer({});
    setAlert(null);
    if (!allowSubmit()) return;
    try {
      await save.mutateAsync(changes);
    } catch (cause) {
      if (isApiError(cause, 'RESOURCE_CONFLICT') && cause.details.some((detail) => detail.field === 'username')) {
        setServer({ username: copy.usernameTaken });
        requestAnimationFrame(() => usernameRef.current?.focus());
      } else if (isApiError(cause) && cause.status === 429) setAlert(copy.tooMany);
      else setAlert([friendlyErrorMessage(cause), '']);
    }
  }

  return (
    <form id={FORMS.profile} className="profile-form" noValidate onSubmit={submit}>
      <ErrorAlert error={alert} />
      <AppInput clearable={false} {...fieldProps('fullname')} label={copy.fullname} autoComplete="name" maxLength={150} value={fullname} onChange={edit('fullname', setFullname)} />
      <AppInput clearable={false} {...fieldProps('username')} ref={usernameRef} label={copy.username} hint={copy.usernameHint} autoComplete="username" autoCapitalize="none" value={username} onChange={edit('username', setUsername)} />
      <AppInput clearable={false} {...fieldProps('phone')} label={copy.phone} hint={copy.phoneHint} autoComplete="tel" inputMode="tel" placeholder="+6281234567890" value={phone} onChange={edit('phone', setPhone)} />
    </form>
  );
}

function PasswordTab({ user, onState }: { user: AuthUser; onState: (state: TabState) => void }) {
  const copy = useProfileCopy();
  const policy = useInvitationsCopy().accept.passwordPolicy;
  const { endSession } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [server, setServer] = useState<Partial<Record<PasswordField, string>>>({});
  const [alert, setAlert] = useState<[string, string] | null>(null);
  const refs = { current: useRef<HTMLInputElement>(null), next: useRef<HTMLInputElement>(null) };

  const { field, allowSubmit } = useFieldErrors<PasswordField>(FORMS.password, () => {
    const problems: Partial<Record<PasswordField, string>> = {};
    if (!current) problems.current = copy.currentEmpty;
    if (next.length < 12) problems.next = copy.newShort;
    else if (next.length > 128) problems.next = copy.newLong;
    else if (next === current) problems.next = copy.newSame;
    if (confirm !== next) problems.confirm = copy.mismatch;
    return problems;
  });
  const fieldProps = (name: PasswordField) => {
    const own = field(name);
    return { ...own, error: own.error ?? server[name] };
  };
  const edit = (name: PasswordField, set: (value: string) => void) => (value: string) => {
    set(value);
    setServer((existing) => ({ ...existing, [name]: undefined }));
  };

  useEffect(() => onState({ canSubmit: true, pending }), [onState, pending]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setServer({});
    setAlert(null);
    if (!allowSubmit()) return;
    setPending(true);
    try {
      await accessApi.changePassword({ current_password: current, new_password: next, confirm_password: confirm });
      // CORE revoked every session, this one included: no POST /auth/logout.
      endSession({ passwordUpdatedFor: user.email });
    } catch (cause) {
      setPending(false);
      // For this call a 401 is a wrong current password: the client refreshed once
      // and got the same answer, so the session itself is still valid.
      if (isApiError(cause) && cause.status === 401) {
        setServer({ current: copy.currentWrong });
        requestAnimationFrame(() => refs.current.current?.focus());
      } else if (isApiError(cause) && cause.status === 400) {
        setServer({ next: policy });
        requestAnimationFrame(() => refs.next.current?.focus());
      } else if (isApiError(cause) && cause.status === 429) setAlert(copy.tooMany);
      else setAlert([friendlyErrorMessage(cause), '']);
    }
  }

  return (
    <form id={FORMS.password} className="profile-form" noValidate onSubmit={submit}>
      <ErrorAlert error={alert} />
      <DAlert variant="warning" title={copy.signOutWarning[0]}>
        {copy.signOutWarning[1]}
      </DAlert>
      {/* The username field lets password managers file the new password under this account. */}
      <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
      <AppInput clearable={false} {...fieldProps('current')} ref={refs.current} label={copy.currentPassword} type="password" autoComplete="current-password" value={current} onChange={edit('current', setCurrent)} />
      <AppInput clearable={false} {...fieldProps('next')} ref={refs.next} label={copy.newPassword} hint={copy.newPasswordHint} type="password" autoComplete="new-password" value={next} onChange={edit('next', setNext)} />
      <AppInput clearable={false} {...fieldProps('confirm')} label={copy.confirmPassword} type="password" autoComplete="new-password" value={confirm} onChange={edit('confirm', setConfirm)} />
    </form>
  );
}
