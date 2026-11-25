import { DAlert, DDialog } from '@digvation/ui';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isApiError } from '../../../shared/api/api-error';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { formatInstant } from '../../../shared/format/date';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput } from '../../../shared/ui/form-fields';
import { accessApi } from '../access-api';
import { accessKeys } from '../access-queries';
import { useInvitationsCopy } from '../invitations-copy';
// Shares the dialog form and footer layout of the users page status dialog.
import '../pages/users-page.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invite user (docs/design/05-invitations.html, section C), opened from the
 * Users page button and the "Kirim ulang" row action. `email` prefills the field.
 */
export function InviteUserDialog({ open, email: initial = '', onClose }: { open: boolean; email?: string; onClose: () => void }) {
  const copy = useInvitationsCopy().dialog;
  const [email, setEmail] = useState(initial);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [failed, setFailed] = useState<[string, string] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(initial);
    setFieldError(undefined);
    setFailed(null);
  }, [open, initial]);

  const invite = useApiMutation((value: string) => accessApi.invite({ email: value }), {
    success: (result, value) => copy.sent(value, formatInstant(result.expires_at)),
    invalidate: [accessKeys.all],
    toastErrors: false,
    onSuccess: onClose,
  });

  const focusField = () => requestAnimationFrame(() => inputRef.current?.focus());

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (invite.isPending) return;
    const value = email.trim().toLowerCase();
    const problem = !value ? copy.empty : EMAIL.test(value) ? undefined : copy.invalid;
    setFieldError(problem);
    setFailed(null);
    if (problem) return focusField();
    try {
      await invite.mutateAsync(value);
    } catch (cause) {
      const code = isApiError(cause) ? cause.code : undefined;
      if (code && copy.errors[code]) {
        setFieldError(copy.errors[code]);
        focusField();
      } else if (code === 'INVITATION_DELIVERY_FAILED') {
        setFailed(copy.deliveryFailed as [string, string]);
      } else {
        setFailed([friendlyErrorMessage(cause), '']);
      }
    }
  }

  return (
    <DDialog
      open={open}
      onClose={onClose}
      size="md"
      overlayClassName="app-dialog-overlay"
      title={copy.title}
      description={copy.description}
      footer={
        <div className="user-status-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={invite.isPending}>
            {copy.cancel}
          </AppAction>
          <AppAction type="submit" form="invite-form" loading={invite.isPending}>
            {invite.isPending ? copy.sending : copy.send}
          </AppAction>
        </div>
      }
    >
      <form id="invite-form" className="user-status-form" noValidate onSubmit={submit}>
        {failed ? (
          <DAlert variant="danger" title={failed[0]}>
            {failed[1] || null}
          </DAlert>
        ) : null}
        <AppInput
          ref={inputRef}
          label={copy.email}
          type="email"
          autoComplete="off"
          placeholder={copy.placeholder}
          value={email}
          onChange={setEmail}
          error={fieldError}
        />
        <DAlert variant="info" title={copy.noRole[0]}>
          {copy.noRole[1]}
        </DAlert>
      </form>
    </DDialog>
  );
}
