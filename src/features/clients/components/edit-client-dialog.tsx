import { DAlert, DDialog } from '@digvation/ui';
import { useState, type FormEvent } from 'react';
import { isApiError } from '../../../shared/api/api-error';
import { friendlyErrorMessage } from '../../../shared/api/error-messages';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import type { Dto } from '../../../shared/api/types';
import { formatPhone, normalizePhoneInput } from '../../../shared/format/phone';
import { useFieldErrors } from '../../../shared/forms/use-field-errors';
import { AppAction } from '../../../shared/ui/app-action';
import { AppInput, AppTextarea, focusFirstInvalid } from '../../../shared/ui/form-fields';
import { clientsApi, type Client } from '../clients-api';
import { EMAIL } from '../client-rules';
import { useClientsCopy } from '../clients-copy';
import { clientKeys } from '../clients-queries';

type Field = 'name' | 'email' | 'phone' | 'address';
const FORM = 'edit-client-form';
const SERVER_FIELDS: Record<string, Field> = { full_name: 'name', email: 'email', phone: 'phone', address: 'address' };

/** Edit client (docs/design/07-clients.html, section F): PATCH /clients/{id} with the changed fields only. */
export function EditClientDialog({ client, onClose }: { client: Client | null; onClose: () => void }) {
  // Keeps the last client while the dialog closes, so its text does not jump.
  const [shown, setShown] = useState(client);
  const [opening, setOpening] = useState(0);
  if (client && client !== shown) {
    setShown(client);
    setOpening((value) => value + 1);
  }
  if (!shown) return null;
  return <EditClientForm key={opening} client={shown} open={client !== null} onClose={onClose} />;
}

function EditClientForm({ client, open, onClose }: { client: Client; open: boolean; onClose: () => void }) {
  const copy = useClientsCopy();
  const text = copy.editDialog;
  const fields = copy.registerDialog;
  const [name, setName] = useState(client.full_name ?? '');
  const [email, setEmail] = useState(client.email ?? '');
  const [phone, setPhone] = useState(formatPhone(client.phone));
  const [address, setAddress] = useState(client.address ?? '');
  const [server, setServer] = useState<Partial<Record<Field, string>>>({});
  const [alert, setAlert] = useState<string | null>(null);

  const save = useApiMutation((body: Dto<'UpdateClientDto'>) => clientsApi.update(client.id, body), {
    success: text.done,
    invalidate: [clientKeys.all],
    toastErrors: false,
    onSuccess: onClose,
  });

  const { field, allowSubmit } = useFieldErrors<Field>(FORM, () => {
    const problems: Partial<Record<Field, string>> = {};
    if (!name.trim()) problems.name = copy.required;
    if (!email.trim()) problems.email = copy.required;
    else if (!EMAIL.test(email.trim())) problems.email = copy.emailInvalid;
    // CORE keeps a phone once set: it cannot be cleared.
    if (!phone.trim()) problems.phone = copy.phoneRequired;
    else if (!normalizePhoneInput(phone)) problems.phone = copy.phoneInvalid;
    return problems;
  });
  const fieldProps = (key: Field) => {
    const own = field(key);
    return { ...own, error: own.error ?? server[key] };
  };
  const edit = (key: Field, set: (value: string) => void) => (value: string) => {
    set(value);
    setServer((current) => ({ ...current, [key]: undefined }));
  };

  // Only what changed is sent; a phone counts as changed when CORE would store other digits.
  const changes: Dto<'UpdateClientDto'> = {};
  if (name.trim() !== (client.full_name ?? '')) changes.full_name = name.trim();
  if (email.trim() !== (client.email ?? '')) changes.email = email.trim();
  if ((normalizePhoneInput(phone) ?? phone.trim()) !== (client.phone ?? '')) changes.phone = phone.trim();
  if (address.trim() !== (client.address ?? '')) changes.address = address.trim() || null;
  const changed = Object.keys(changes).length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!changed || save.isPending) return;
    setServer({});
    setAlert(null);
    if (!allowSubmit()) return;
    try {
      await save.mutateAsync(changes);
    } catch (cause) {
      const mapped: Partial<Record<Field, string>> = {};
      if (isApiError(cause) && cause.status === 400) {
        for (const detail of cause.details) {
          const key = detail.field ? SERVER_FIELDS[detail.field] : undefined;
          if (key && !mapped[key]) mapped[key] = detail.reason === 'phone_format' ? copy.phoneInvalid : detail.message;
        }
      }
      if (Object.keys(mapped).length) {
        setServer(mapped);
        focusFirstInvalid(FORM);
      } else setAlert(friendlyErrorMessage(cause));
    }
  }

  return (
    <DDialog
      open={open}
      onClose={() => !save.isPending && onClose()}
      size="md"
      overlayClassName="app-dialog-overlay"
      title={text.title}
      description={text.description(client.code)}
      footer={
        <div className="clients-dialog-actions">
          <AppAction tone="secondary" onClick={onClose} disabled={save.isPending}>
            {copy.cancel}
          </AppAction>
          <AppAction type="submit" form={FORM} disabled={!changed} loading={save.isPending}>
            {save.isPending ? copy.saving : text.submit}
          </AppAction>
        </div>
      }
    >
      <form id={FORM} className="clients-form" noValidate onSubmit={submit}>
        {alert ? <DAlert variant="danger" title={alert} /> : null}
        <AppInput clearable={false} {...fieldProps('name')} label={fields.name} maxLength={254} value={name} onChange={edit('name', setName)} />
        <AppInput clearable={false} {...fieldProps('email')} label={fields.email} type="email" maxLength={254} value={email} onChange={edit('email', setEmail)} />
        <AppInput clearable={false} {...fieldProps('phone')} label={fields.phone} hint={text.phoneHint} inputMode="tel" maxLength={40} value={phone} onChange={edit('phone', setPhone)} />
        <AppTextarea clearable={false} {...fieldProps('address')} label={fields.address} rows={2} maxLength={500} value={address} onChange={edit('address', setAddress)} />
      </form>
    </DDialog>
  );
}
