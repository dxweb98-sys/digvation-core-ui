import { DAlert, DDialog } from '@digvation/ui';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isApiError } from '../../../shared/api/api-error';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { AppAction } from '../../../shared/ui/app-action';
import { AppTextarea } from '../../../shared/ui/form-fields';
import { accessApi, type User } from '../access-api';
import { accessKeys } from '../access-queries';
import { useUsersCopy } from '../users-copy';

const REASON_MAX = 500;

/** Deactivates or reactivates one user with a reason CORE records in the access audit. */
export function UserStatusDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const copy = useUsersCopy();
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<[string, string] | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  // Keeps the last user while the dialog closes, so its text does not jump.
  const [shown, setShown] = useState(user);
  if (user && user !== shown) setShown(user);

  useEffect(() => {
    if (!user) return;
    setReason('');
    setAttempted(false);
    setError(null);
  }, [user]);

  const deactivating = shown?.is_active ?? false;
  const name = shown?.fullname ?? '';
  const first = name.split(/\s+/)[0] ?? name;

  const change = useApiMutation(
    (input: { user: User; reason: string }) =>
      accessApi.setUserStatus(input.user.id, { is_active: !input.user.is_active, reason: input.reason }),
    {
      success: (_, input) =>
        input.user.is_active ? copy.deactivated(input.user.fullname) : copy.reactivated(input.user.fullname),
      invalidate: [accessKeys.all],
      toastErrors: false,
      onSuccess: onClose,
    },
  );

  const reasonError = attempted && !reason.trim() ? copy.reasonEmpty : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!shown || change.isPending) return;
    if (!reason.trim()) {
      setAttempted(true);
      requestAnimationFrame(() => reasonRef.current?.focus());
      return;
    }
    setError(null);
    try {
      await change.mutateAsync({ user: shown, reason: reason.trim() });
    } catch (cause) {
      const code = isApiError(cause) ? cause.code : undefined;
      setError((code && copy.errors[code]) || [friendlyErrorMessage(cause), '']);
    }
  }

  return (
    <DDialog
      open={user !== null}
      onClose={onClose}
      size="md"
      overlayClassName="app-dialog-overlay"
      title={deactivating ? copy.deactivateTitle(name) : copy.reactivateTitle(name)}
      description={shown?.email}
      footer={
        <div className="user-status-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={change.isPending}>
            {copy.cancel}
          </AppAction>
          <AppAction
            tone={deactivating ? 'danger' : 'primary'}
            type="submit"
            form="user-status-form"
            loading={change.isPending}
          >
            {change.isPending ? copy.saving : deactivating ? copy.deactivate : copy.reactivate}
          </AppAction>
        </div>
      }
    >
      <form id="user-status-form" className="user-status-form" noValidate onSubmit={submit}>
        {error ? (
          <DAlert variant="danger" title={error[0]}>
            {error[1] || null}
          </DAlert>
        ) : null}
        <p className="user-status-body">{deactivating ? copy.deactivateBody(first) : copy.reactivateBody(first)}</p>
        <AppTextarea
          ref={reasonRef}
          label={copy.reason}
          rows={3}
          maxLength={REASON_MAX}
          placeholder={deactivating ? copy.deactivatePlaceholder : copy.reactivatePlaceholder}
          value={reason}
          onChange={setReason}
          error={reasonError}
          hint={
            <span className="user-status-hint">
              <span>{copy.reasonHint}</span>
              <span>
                {reason.length}/{REASON_MAX}
              </span>
            </span>
          }
        />
      </form>
    </DDialog>
  );
}
