import { DAlert, DDialog, DRadio } from '@digvation/ui';
import { useState, type FormEvent } from 'react';
import { isApiError } from '../../../shared/api/api-error';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { AppAction } from '../../../shared/ui/app-action';
import { AppTextarea } from '../../../shared/ui/form-fields';
import { clientsApi, type Client, type ClientStatus } from '../clients-api';
import { CLIENT_TRANSITIONS } from '../client-rules';
import { useClientsCopy } from '../clients-copy';
import { clientKeys } from '../clients-queries';
import { ClientStatusPill } from './client-parts';

const FORM = 'client-status-form';
const REASON_MAX = 500;

/** Change status (docs/design/07-clients.html, section G): PATCH /clients/{id}/status. */
export function ClientStatusDialog({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const [shown, setShown] = useState(client);
  const [opening, setOpening] = useState(0);
  if (client && client !== shown) {
    setShown(client);
    setOpening((value) => value + 1);
  }
  if (!shown) return null;
  return <ClientStatusForm key={opening} client={shown} open={client !== null} onClose={onClose} />;
}

function ClientStatusForm({ client, open, onClose }: { client: Client; open: boolean; onClose: () => void }) {
  const copy = useClientsCopy();
  const text = copy.statusDialog;
  const [target, setTarget] = useState<ClientStatus | null>(null);
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [alert, setAlert] = useState<[string, string] | null>(null);
  const options = CLIENT_TRANSITIONS[client.status];

  const save = useApiMutation(
    (input: { target: ClientStatus; reason: string }) =>
      clientsApi.transition(client.id, { target_status: input.target, reason: input.reason }),
    {
      success: (result) => text.done(copy.status[result.status]),
      invalidate: [clientKeys.all],
      toastErrors: false,
      onSuccess: onClose,
    },
  );

  const targetError = attempted && !target ? text.choose : undefined;
  const reasonError = attempted && !reason.trim() ? text.reasonEmpty : undefined;
  const count = (
    <span aria-live="polite">
      {reason.length}/{REASON_MAX}
    </span>
  );
  const option = target ? text.options[`${client.status}>${target}`] : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    setAttempted(true);
    setAlert(null);
    if (!target) {
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`#${FORM} input[type="radio"]`)?.focus());
      return;
    }
    if (!reason.trim()) {
      requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(`#${FORM} textarea`)?.focus());
      return;
    }
    try {
      await save.mutateAsync({ target, reason: reason.trim() });
    } catch (cause) {
      setAlert(isApiError(cause, 'CLIENT_INVALID_TRANSITION') ? text.changed : [friendlyErrorMessage(cause), '']);
    }
  }

  return (
    <DDialog
      open={open}
      onClose={() => !save.isPending && onClose()}
      size="md"
      overlayClassName="app-dialog-overlay"
      title={text.title}
      description={`${client.full_name ?? client.code} · ${client.code}`}
      footer={
        <div className="clients-dialog-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={save.isPending}>
            {copy.cancel}
          </AppAction>
          <AppAction
            type="submit"
            form={FORM}
            tone={target === 'ARCHIVED' ? 'danger' : 'primary'}
            loading={save.isPending}
          >
            {save.isPending ? copy.saving : (option?.[0] ?? text.submit)}
          </AppAction>
        </div>
      }
    >
      <form id={FORM} className="clients-form" noValidate onSubmit={submit}>
        {alert ? (
          <DAlert variant="danger" title={alert[0]}>
            {alert[1] || null}
          </DAlert>
        ) : null}
        <div className="clients-now">
          <span className="clients-muted">{text.current}</span>
          <ClientStatusPill status={client.status} />
        </div>
        <div
          role="radiogroup"
          aria-label={text.choices}
          aria-invalid={targetError ? true : undefined}
          aria-describedby={targetError ? `${FORM}-target-error` : undefined}
          className="clients-options"
        >
          {options.map((value) => {
            const [label, hint] = text.options[`${client.status}>${value}`];
            const hintId = `${FORM}-${value}-hint`;
            return (
              <label key={value} className={`clients-option${target === value ? ' clients-option-on' : ''}`}>
                <DRadio
                  name="target_status"
                  value={value}
                  checked={target === value}
                  aria-describedby={hintId}
                  onChange={() => setTarget(value)}
                />
                <span>
                  <b>{label}</b>
                  <span id={hintId} className="clients-muted clients-small">
                    {hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {targetError ? (
          <p id={`${FORM}-target-error`} className="clients-field-error">
            {targetError}
          </p>
        ) : null}
        <AppTextarea
          clearable={false}
          label={text.reason}
          hint={
            <span className="clients-hint-count">
              <span>{text.reasonHint}</span>
              {count}
            </span>
          }
          // The counter stays while the error replaces the hint.
          error={
            reasonError ? (
              <span className="clients-hint-count">
                <span>{reasonError}</span>
                {count}
              </span>
            ) : undefined
          }
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(value) => setReason(value)}
        />
      </form>
    </DDialog>
  );
}
